from datetime import date, datetime, timezone
from math import ceil

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_authorized_membership, get_current_psicologo
from app.db.session import get_db
from app.models import (
    Compromiso,
    EstadoEnvio,
    Paciente,
    Proceso,
    Psicologo,
    PsicologoConsultorio,
    RegistroEnvioHistoria,
    Sesion,
)
from app.schemas.clinical import (
    CompromisoCreate,
    CompromisoResponse,
    CompromisoUpdate,
    EnvioHistoriaCreate,
    HistoriaClinicaResponse,
    PacienteCreate,
    PacienteResponse,
    PacienteUpdate,
    ProcesoCreate,
    ProcesoHistoriaResponse,
    ProcesoResponse,
    ProcesoUpdate,
    RegistroEnvioHistoriaResponse,
    SesionCreate,
    SesionHistoriaResponse,
    SesionResponse,
    SesionUpdate,
)
from app.schemas.common import PageResponse
from app.services.mail import send_mail

router = APIRouter(prefix="/clinica", tags=["clinica"])


def calculate_age(fecha_nacimiento: date | None) -> int | None:
    if fecha_nacimiento is None:
        return None
    today = date.today()
    age = today.year - fecha_nacimiento.year
    if (today.month, today.day) < (fecha_nacimiento.month, fecha_nacimiento.day):
        age -= 1
    return age


def paciente_response(paciente: Paciente) -> PacienteResponse:
    data = PacienteResponse.model_validate(paciente)
    data.edad = calculate_age(paciente.fecha_nacimiento)
    return data


def get_owned_paciente(
    paciente_id: int,
    membership: PsicologoConsultorio,
    db: Session,
    include_inactive: bool = False,
) -> Paciente:
    conditions = [
        Paciente.id == paciente_id,
        Paciente.consultorio_id == membership.consultorio_id,
        Paciente.psicologo_id == membership.psicologo_id,
    ]
    if not include_inactive:
        conditions.append(Paciente.activo.is_(True))

    paciente = db.scalar(select(Paciente).where(*conditions))
    if paciente is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Paciente no encontrado")
    return paciente


def get_owned_proceso(proceso_id: int, membership: PsicologoConsultorio, db: Session) -> Proceso:
    proceso = db.scalar(
        select(Proceso)
        .join(Proceso.paciente)
        .where(
            Proceso.id == proceso_id,
            Paciente.consultorio_id == membership.consultorio_id,
            Paciente.psicologo_id == membership.psicologo_id,
            Paciente.activo.is_(True),
        )
    )
    if proceso is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Proceso no encontrado")
    return proceso


def get_owned_sesion(sesion_id: int, membership: PsicologoConsultorio, db: Session) -> Sesion:
    sesion = db.scalar(
        select(Sesion)
        .join(Sesion.proceso)
        .join(Proceso.paciente)
        .where(
            Sesion.id == sesion_id,
            Paciente.consultorio_id == membership.consultorio_id,
            Paciente.psicologo_id == membership.psicologo_id,
            Paciente.activo.is_(True),
        )
    )
    if sesion is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sesion no encontrada")
    return sesion


def get_owned_compromiso(compromiso_id: int, membership: PsicologoConsultorio, db: Session) -> Compromiso:
    compromiso = db.scalar(
        select(Compromiso)
        .join(Compromiso.sesion)
        .join(Sesion.proceso)
        .join(Proceso.paciente)
        .where(
            Compromiso.id == compromiso_id,
            Paciente.consultorio_id == membership.consultorio_id,
            Paciente.psicologo_id == membership.psicologo_id,
            Paciente.activo.is_(True),
        )
    )
    if compromiso is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Compromiso no encontrado")
    return compromiso


def apply_updates(entity: object, values: dict[str, object]) -> None:
    for field, value in values.items():
        setattr(entity, field, value)


@router.get("/pacientes", response_model=PageResponse[PacienteResponse])
def list_pacientes(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    search: str | None = Query(default=None, min_length=1, max_length=150),
    membership: PsicologoConsultorio = Depends(get_authorized_membership),
    db: Session = Depends(get_db),
) -> PageResponse[PacienteResponse]:
    conditions = [
        Paciente.consultorio_id == membership.consultorio_id,
        Paciente.psicologo_id == membership.psicologo_id,
        Paciente.activo.is_(True),
    ]
    if search:
        like = f"%{search.strip()}%"
        conditions.append(or_(Paciente.nombre.ilike(like), Paciente.documento_identidad.ilike(like)))

    total = db.scalar(select(func.count()).select_from(Paciente).where(*conditions)) or 0

    # Una pagina fuera de rango simplemente no devuelve filas (offset mas alla del
    # total); se responde 200 con items=[] en vez de 404, para no romper a un
    # usuario que quedo con una pagina vieja abierta tras un cambio de filtro.
    pacientes = db.scalars(
        select(Paciente)
        .where(*conditions)
        .order_by(Paciente.nombre)
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()

    return PageResponse(
        items=[paciente_response(paciente) for paciente in pacientes],
        total=total,
        page=page,
        page_size=page_size,
        pages=ceil(total / page_size) if total else 0,
    )


@router.post("/pacientes", response_model=PacienteResponse, status_code=status.HTTP_201_CREATED)
def create_paciente(
    payload: PacienteCreate,
    membership: PsicologoConsultorio = Depends(get_authorized_membership),
    db: Session = Depends(get_db),
) -> PacienteResponse:
    paciente = Paciente(
        consultorio_id=membership.consultorio_id,
        psicologo_id=membership.psicologo_id,
        **payload.model_dump(),
    )
    db.add(paciente)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe un paciente con ese documento para este psicologo",
        ) from exc
    db.refresh(paciente)
    return paciente_response(paciente)


@router.get("/pacientes/{paciente_id}", response_model=PacienteResponse)
def get_paciente(
    paciente_id: int,
    membership: PsicologoConsultorio = Depends(get_authorized_membership),
    db: Session = Depends(get_db),
) -> PacienteResponse:
    return paciente_response(get_owned_paciente(paciente_id, membership, db))


@router.put("/pacientes/{paciente_id}", response_model=PacienteResponse)
def update_paciente(
    paciente_id: int,
    payload: PacienteUpdate,
    membership: PsicologoConsultorio = Depends(get_authorized_membership),
    db: Session = Depends(get_db),
) -> PacienteResponse:
    paciente = get_owned_paciente(paciente_id, membership, db, include_inactive=True)
    apply_updates(paciente, payload.model_dump(exclude_unset=True))
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe un paciente con ese documento para este psicologo",
        ) from exc
    db.refresh(paciente)
    return paciente_response(paciente)


@router.delete("/pacientes/{paciente_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_paciente(
    paciente_id: int,
    membership: PsicologoConsultorio = Depends(get_authorized_membership),
    db: Session = Depends(get_db),
) -> None:
    paciente = get_owned_paciente(paciente_id, membership, db)
    paciente.activo = False
    db.commit()


@router.get("/pacientes/{paciente_id}/procesos", response_model=list[ProcesoResponse])
def list_procesos(
    paciente_id: int,
    membership: PsicologoConsultorio = Depends(get_authorized_membership),
    db: Session = Depends(get_db),
) -> list[Proceso]:
    get_owned_paciente(paciente_id, membership, db)
    return list(
        db.scalars(
            select(Proceso)
            .where(Proceso.paciente_id == paciente_id)
            .order_by(Proceso.fecha_vinculacion.desc(), Proceso.id.desc())
        ).all()
    )


@router.post("/pacientes/{paciente_id}/procesos", response_model=ProcesoResponse, status_code=status.HTTP_201_CREATED)
def create_proceso(
    paciente_id: int,
    payload: ProcesoCreate,
    membership: PsicologoConsultorio = Depends(get_authorized_membership),
    db: Session = Depends(get_db),
) -> Proceso:
    get_owned_paciente(paciente_id, membership, db)
    proceso = Proceso(paciente_id=paciente_id, **payload.model_dump())
    db.add(proceso)
    db.commit()
    db.refresh(proceso)
    return proceso


@router.get("/procesos/{proceso_id}", response_model=ProcesoResponse)
def get_proceso(
    proceso_id: int,
    membership: PsicologoConsultorio = Depends(get_authorized_membership),
    db: Session = Depends(get_db),
) -> Proceso:
    return get_owned_proceso(proceso_id, membership, db)


@router.put("/procesos/{proceso_id}", response_model=ProcesoResponse)
def update_proceso(
    proceso_id: int,
    payload: ProcesoUpdate,
    membership: PsicologoConsultorio = Depends(get_authorized_membership),
    db: Session = Depends(get_db),
) -> Proceso:
    proceso = get_owned_proceso(proceso_id, membership, db)
    apply_updates(proceso, payload.model_dump(exclude_unset=True))
    db.commit()
    db.refresh(proceso)
    return proceso


@router.delete("/procesos/{proceso_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_proceso(
    proceso_id: int,
    membership: PsicologoConsultorio = Depends(get_authorized_membership),
    db: Session = Depends(get_db),
) -> None:
    proceso = get_owned_proceso(proceso_id, membership, db)
    db.delete(proceso)
    db.commit()


@router.get("/procesos/{proceso_id}/sesiones", response_model=list[SesionResponse])
def list_sesiones(
    proceso_id: int,
    membership: PsicologoConsultorio = Depends(get_authorized_membership),
    db: Session = Depends(get_db),
) -> list[Sesion]:
    get_owned_proceso(proceso_id, membership, db)
    return list(
        db.scalars(
            select(Sesion)
            .where(Sesion.proceso_id == proceso_id)
            .order_by(Sesion.numero_sesion, Sesion.fecha_sesion)
        ).all()
    )


@router.post("/procesos/{proceso_id}/sesiones", response_model=SesionResponse, status_code=status.HTTP_201_CREATED)
def create_sesion(
    proceso_id: int,
    payload: SesionCreate,
    membership: PsicologoConsultorio = Depends(get_authorized_membership),
    db: Session = Depends(get_db),
) -> Sesion:
    get_owned_proceso(proceso_id, membership, db)
    sesion = Sesion(proceso_id=proceso_id, **payload.model_dump())
    db.add(sesion)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe una sesion con ese numero en el proceso",
        ) from exc
    db.refresh(sesion)
    return sesion


@router.get("/sesiones/{sesion_id}", response_model=SesionResponse)
def get_sesion(
    sesion_id: int,
    membership: PsicologoConsultorio = Depends(get_authorized_membership),
    db: Session = Depends(get_db),
) -> Sesion:
    return get_owned_sesion(sesion_id, membership, db)


@router.put("/sesiones/{sesion_id}", response_model=SesionResponse)
def update_sesion(
    sesion_id: int,
    payload: SesionUpdate,
    membership: PsicologoConsultorio = Depends(get_authorized_membership),
    db: Session = Depends(get_db),
) -> Sesion:
    sesion = get_owned_sesion(sesion_id, membership, db)
    apply_updates(sesion, payload.model_dump(exclude_unset=True))
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe una sesion con ese numero en el proceso",
        ) from exc
    db.refresh(sesion)
    return sesion


@router.delete("/sesiones/{sesion_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_sesion(
    sesion_id: int,
    membership: PsicologoConsultorio = Depends(get_authorized_membership),
    db: Session = Depends(get_db),
) -> None:
    sesion = get_owned_sesion(sesion_id, membership, db)
    db.delete(sesion)
    db.commit()


@router.get("/sesiones/{sesion_id}/compromisos", response_model=list[CompromisoResponse])
def list_compromisos(
    sesion_id: int,
    membership: PsicologoConsultorio = Depends(get_authorized_membership),
    db: Session = Depends(get_db),
) -> list[Compromiso]:
    get_owned_sesion(sesion_id, membership, db)
    return list(
        db.scalars(
            select(Compromiso)
            .where(Compromiso.sesion_id == sesion_id)
            .order_by(Compromiso.id)
        ).all()
    )


@router.post("/sesiones/{sesion_id}/compromisos", response_model=CompromisoResponse, status_code=status.HTTP_201_CREATED)
def create_compromiso(
    sesion_id: int,
    payload: CompromisoCreate,
    membership: PsicologoConsultorio = Depends(get_authorized_membership),
    db: Session = Depends(get_db),
) -> Compromiso:
    get_owned_sesion(sesion_id, membership, db)
    compromiso = Compromiso(sesion_id=sesion_id, **payload.model_dump())
    db.add(compromiso)
    db.commit()
    db.refresh(compromiso)
    return compromiso


@router.get("/compromisos/{compromiso_id}", response_model=CompromisoResponse)
def get_compromiso(
    compromiso_id: int,
    membership: PsicologoConsultorio = Depends(get_authorized_membership),
    db: Session = Depends(get_db),
) -> Compromiso:
    return get_owned_compromiso(compromiso_id, membership, db)


@router.put("/compromisos/{compromiso_id}", response_model=CompromisoResponse)
def update_compromiso(
    compromiso_id: int,
    payload: CompromisoUpdate,
    membership: PsicologoConsultorio = Depends(get_authorized_membership),
    db: Session = Depends(get_db),
) -> Compromiso:
    compromiso = get_owned_compromiso(compromiso_id, membership, db)
    apply_updates(compromiso, payload.model_dump(exclude_unset=True))
    db.commit()
    db.refresh(compromiso)
    return compromiso


@router.delete("/compromisos/{compromiso_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_compromiso(
    compromiso_id: int,
    membership: PsicologoConsultorio = Depends(get_authorized_membership),
    db: Session = Depends(get_db),
) -> None:
    compromiso = get_owned_compromiso(compromiso_id, membership, db)
    db.delete(compromiso)
    db.commit()


@router.get("/pacientes/{paciente_id}/historia", response_model=HistoriaClinicaResponse)
def get_historia_clinica(
    paciente_id: int,
    membership: PsicologoConsultorio = Depends(get_authorized_membership),
    db: Session = Depends(get_db),
) -> HistoriaClinicaResponse:
    paciente = db.scalar(
        select(Paciente)
        .options(selectinload(Paciente.procesos).selectinload(Proceso.sesiones).selectinload(Sesion.compromisos))
        .where(
            Paciente.id == paciente_id,
            Paciente.consultorio_id == membership.consultorio_id,
            Paciente.psicologo_id == membership.psicologo_id,
            Paciente.activo.is_(True),
        )
    )
    if paciente is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Paciente no encontrado")

    procesos = []
    for proceso in sorted(paciente.procesos, key=lambda item: (item.fecha_vinculacion, item.id), reverse=True):
        sesiones = []
        for sesion in sorted(proceso.sesiones, key=lambda item: (item.numero_sesion, item.fecha_sesion)):
            sesion_data = SesionHistoriaResponse.model_validate(sesion)
            sesion_data.compromisos = [CompromisoResponse.model_validate(c) for c in sesion.compromisos]
            sesiones.append(sesion_data)
        proceso_data = ProcesoHistoriaResponse.model_validate(proceso)
        proceso_data.sesiones = sesiones
        procesos.append(proceso_data)

    return HistoriaClinicaResponse(paciente=paciente_response(paciente), procesos=procesos)


@router.get("/procesos/{proceso_id}/resumen", response_model=ProcesoHistoriaResponse)
def get_resumen_proceso(
    proceso_id: int,
    membership: PsicologoConsultorio = Depends(get_authorized_membership),
    db: Session = Depends(get_db),
) -> ProcesoHistoriaResponse:
    proceso = db.scalar(
        select(Proceso)
        .options(selectinload(Proceso.sesiones).selectinload(Sesion.compromisos))
        .join(Proceso.paciente)
        .where(
            Proceso.id == proceso_id,
            Paciente.consultorio_id == membership.consultorio_id,
            Paciente.psicologo_id == membership.psicologo_id,
            Paciente.activo.is_(True),
        )
    )
    if proceso is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Proceso no encontrado")

    proceso_data = ProcesoHistoriaResponse.model_validate(proceso)
    proceso_data.sesiones = []
    for sesion in sorted(proceso.sesiones, key=lambda item: (item.numero_sesion, item.fecha_sesion)):
        sesion_data = SesionHistoriaResponse.model_validate(sesion)
        sesion_data.compromisos = [CompromisoResponse.model_validate(c) for c in sesion.compromisos]
        proceso_data.sesiones.append(sesion_data)
    return proceso_data


@router.get("/pacientes/{paciente_id}/resumen-sesiones", response_model=list[SesionHistoriaResponse])
def get_resumen_sesiones(
    paciente_id: int,
    membership: PsicologoConsultorio = Depends(get_authorized_membership),
    db: Session = Depends(get_db),
) -> list[SesionHistoriaResponse]:
    get_owned_paciente(paciente_id, membership, db)
    sesiones = db.scalars(
        select(Sesion)
        .options(selectinload(Sesion.compromisos))
        .join(Sesion.proceso)
        .where(Proceso.paciente_id == paciente_id)
        .order_by(Sesion.fecha_sesion, Sesion.numero_sesion)
    ).all()
    response = []
    for sesion in sesiones:
        sesion_data = SesionHistoriaResponse.model_validate(sesion)
        sesion_data.compromisos = [CompromisoResponse.model_validate(c) for c in sesion.compromisos]
        response.append(sesion_data)
    return response


@router.post("/pacientes/{paciente_id}/envios", response_model=RegistroEnvioHistoriaResponse, status_code=status.HTTP_201_CREATED)
def enviar_historia(
    paciente_id: int,
    payload: EnvioHistoriaCreate,
    membership: PsicologoConsultorio = Depends(get_authorized_membership),
    current_psicologo: Psicologo = Depends(get_current_psicologo),
    db: Session = Depends(get_db),
) -> RegistroEnvioHistoria:
    paciente = get_owned_paciente(paciente_id, membership, db)
    subject = "Historia clinica psicologica"
    body = (
        f"Se genera envio de {payload.tipo_documento.value} para el paciente "
        f"{paciente.nombre}. Consulte la aplicacion para el detalle completo."
    )
    result = send_mail(str(payload.email_destino), subject, body)
    registro = RegistroEnvioHistoria(
        paciente_id=paciente.id,
        psicologo_id=current_psicologo.id,
        consultorio_id=membership.consultorio_id,
        tipo_documento=payload.tipo_documento,
        email_destino=str(payload.email_destino),
        enviado_at=datetime.now(timezone.utc).replace(tzinfo=None),
        estado=EstadoEnvio.ENVIADO if result.sent else EstadoEnvio.FALLIDO,
        error=result.error,
    )
    db.add(registro)
    db.commit()
    db.refresh(registro)
    return registro
