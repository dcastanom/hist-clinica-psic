from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_admin_membership, get_current_psicologo
from app.core.security import create_access_token, hash_password, verify_password
from app.db.session import get_db
from app.models import Consultorio, EstadoVinculacion, Psicologo, PsicologoConsultorio, RolConsultorio
from app.schemas.auth import (
    ConsultorioMembershipResponse,
    LoginRequest,
    PasswordChangeRequest,
    PendingMembershipResponse,
    PsicologoRegisterRequest,
    PsicologoResponse,
    PsicologoUpdateRequest,
    RegisterResponse,
    TokenResponse,
)

router = APIRouter(prefix="/auth", tags=["auth"])
admin_router = APIRouter(prefix="/admin", tags=["admin"])


def membership_response(vinculo: PsicologoConsultorio) -> ConsultorioMembershipResponse:
    return ConsultorioMembershipResponse(
        vinculo_id=vinculo.id,
        consultorio_id=vinculo.consultorio_id,
        nit=vinculo.consultorio.nit,
        nombre=vinculo.consultorio.nombre,
        rol=vinculo.rol,
        estado=vinculo.estado,
    )


@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
def register(payload: PsicologoRegisterRequest, db: Session = Depends(get_db)) -> RegisterResponse:
    consultorio = db.get(Consultorio, payload.consultorio_id)
    if consultorio is None or not consultorio.activo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Consultorio no existe")

    psicologo = db.scalar(select(Psicologo).where(Psicologo.email == payload.email))
    if psicologo is None:
        # cedula/nombre ya no se piden en el registro; quedan vacios hasta que el
        # psicologo los complete en su perfil (PUT /auth/me).
        psicologo = Psicologo(
            cedula="",
            nombre="",
            especialidad=None,
            tarjeta_profesional=None,
            telefono_contacto=None,
            email=str(payload.email),
            password_hash=hash_password(payload.password),
            avatar_url=None,
        )
        db.add(psicologo)
        db.flush()
    else:
        existing = db.scalar(
            select(PsicologoConsultorio).where(
                PsicologoConsultorio.psicologo_id == psicologo.id,
                PsicologoConsultorio.consultorio_id == consultorio.id,
            )
        )
        if existing is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="El psicologo ya tiene una solicitud o vinculacion con este consultorio",
            )

    rol = RolConsultorio.ADMIN if payload.solicita_admin else RolConsultorio.PSICOLOGO
    if rol == RolConsultorio.ADMIN:
        admin_exists = db.scalar(
            select(PsicologoConsultorio).where(
                PsicologoConsultorio.consultorio_id == consultorio.id,
                PsicologoConsultorio.rol == RolConsultorio.ADMIN,
                PsicologoConsultorio.estado == EstadoVinculacion.AUTORIZADO,
            )
        )
        if admin_exists is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Este consultorio ya tiene administrador autorizado",
            )

    vinculo = PsicologoConsultorio(
        psicologo_id=psicologo.id,
        consultorio_id=consultorio.id,
        rol=rol,
        estado=EstadoVinculacion.PENDIENTE,
    )
    db.add(vinculo)
    db.commit()
    db.refresh(psicologo)
    db.refresh(vinculo)
    return RegisterResponse(psicologo=PsicologoResponse.model_validate(psicologo), consultorio=membership_response(vinculo))


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    psicologo = db.scalar(select(Psicologo).where(Psicologo.email == payload.email))
    if psicologo is None or not verify_password(payload.password, psicologo.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciales invalidas")
    if not psicologo.activo:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Usuario inactivo")
    return TokenResponse(access_token=create_access_token(str(psicologo.id)))


@router.get("/me", response_model=PsicologoResponse)
def me(current_psicologo: Psicologo = Depends(get_current_psicologo)) -> Psicologo:
    return current_psicologo


@router.put("/me", response_model=PsicologoResponse)
def update_me(
    payload: PsicologoUpdateRequest,
    current_psicologo: Psicologo = Depends(get_current_psicologo),
    db: Session = Depends(get_db),
) -> Psicologo:
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(current_psicologo, field, value)
    db.commit()
    db.refresh(current_psicologo)
    return current_psicologo


@router.put("/me/password", status_code=status.HTTP_204_NO_CONTENT)
def change_my_password(
    payload: PasswordChangeRequest,
    current_psicologo: Psicologo = Depends(get_current_psicologo),
    db: Session = Depends(get_db),
) -> None:
    if not verify_password(payload.current_password, current_psicologo.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Contrasena actual incorrecta")
    current_psicologo.password_hash = hash_password(payload.new_password)
    db.commit()


@router.get("/consultorios", response_model=list[ConsultorioMembershipResponse])
def my_consultorios(
    current_psicologo: Psicologo = Depends(get_current_psicologo),
    db: Session = Depends(get_db),
) -> list[ConsultorioMembershipResponse]:
    vinculos = db.scalars(
        select(PsicologoConsultorio)
        .join(PsicologoConsultorio.consultorio)
        .where(PsicologoConsultorio.psicologo_id == current_psicologo.id)
        .order_by(Consultorio.nombre)
    ).all()
    return [membership_response(vinculo) for vinculo in vinculos]


@admin_router.get("/solicitudes", response_model=list[PendingMembershipResponse])
def list_pending_memberships(
    admin_membership: PsicologoConsultorio = Depends(get_admin_membership),
    db: Session = Depends(get_db),
) -> list[PendingMembershipResponse]:
    solicitudes = db.scalars(
        select(PsicologoConsultorio)
        .join(PsicologoConsultorio.psicologo)
        .where(
            PsicologoConsultorio.consultorio_id == admin_membership.consultorio_id,
            PsicologoConsultorio.estado == EstadoVinculacion.PENDIENTE,
        )
        .order_by(PsicologoConsultorio.created_at)
    ).all()
    return [
        PendingMembershipResponse(
            vinculo_id=v.id,
            psicologo_id=v.psicologo_id,
            consultorio_id=v.consultorio_id,
            psicologo_nombre=v.psicologo.nombre,
            psicologo_email=v.psicologo.email,
            psicologo_cedula=v.psicologo.cedula,
            rol_solicitado=v.rol,
            estado=v.estado,
        )
        for v in solicitudes
    ]


@admin_router.post("/solicitudes/{vinculo_id}/autorizar", response_model=ConsultorioMembershipResponse)
def authorize_membership(
    vinculo_id: int,
    admin_membership: PsicologoConsultorio = Depends(get_admin_membership),
    current_psicologo: Psicologo = Depends(get_current_psicologo),
    db: Session = Depends(get_db),
) -> ConsultorioMembershipResponse:
    vinculo = db.get(PsicologoConsultorio, vinculo_id)
    if vinculo is None or vinculo.consultorio_id != admin_membership.consultorio_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Solicitud no encontrada")
    if vinculo.estado != EstadoVinculacion.PENDIENTE:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="La solicitud no esta pendiente")
    if vinculo.rol == RolConsultorio.ADMIN:
        admin_exists = db.scalar(
            select(PsicologoConsultorio).where(
                PsicologoConsultorio.consultorio_id == vinculo.consultorio_id,
                PsicologoConsultorio.rol == RolConsultorio.ADMIN,
                PsicologoConsultorio.estado == EstadoVinculacion.AUTORIZADO,
                PsicologoConsultorio.id != vinculo.id,
            )
        )
        if admin_exists is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Este consultorio ya tiene administrador autorizado",
            )

    vinculo.estado = EstadoVinculacion.AUTORIZADO
    vinculo.autorizado_por_id = current_psicologo.id
    vinculo.autorizado_at = datetime.now(timezone.utc).replace(tzinfo=None)
    db.commit()
    db.refresh(vinculo)
    return membership_response(vinculo)


@admin_router.post("/solicitudes/{vinculo_id}/rechazar", response_model=ConsultorioMembershipResponse)
def reject_membership(
    vinculo_id: int,
    admin_membership: PsicologoConsultorio = Depends(get_admin_membership),
    current_psicologo: Psicologo = Depends(get_current_psicologo),
    db: Session = Depends(get_db),
) -> ConsultorioMembershipResponse:
    vinculo = db.get(PsicologoConsultorio, vinculo_id)
    if vinculo is None or vinculo.consultorio_id != admin_membership.consultorio_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Solicitud no encontrada")
    if vinculo.estado != EstadoVinculacion.PENDIENTE:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="La solicitud no esta pendiente")

    vinculo.estado = EstadoVinculacion.RECHAZADO
    vinculo.autorizado_por_id = current_psicologo.id
    vinculo.autorizado_at = datetime.now(timezone.utc).replace(tzinfo=None)
    db.commit()
    db.refresh(vinculo)
    return membership_response(vinculo)
