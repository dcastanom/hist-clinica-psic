from jose import JWTError, jwt
from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import ALGORITHM
from app.core.config import settings
from app.db.session import get_db
from app.models import EstadoVinculacion, Psicologo, PsicologoConsultorio, RolConsultorio

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_psicologo(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> Psicologo:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No autenticado")

    try:
        payload = jwt.decode(credentials.credentials, settings.secret_key, algorithms=[ALGORITHM])
        subject = payload.get("sub")
    except JWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token invalido") from exc

    if subject is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token invalido")

    psicologo = db.get(Psicologo, int(subject))
    if psicologo is None or not psicologo.activo:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuario inactivo o inexistente")
    return psicologo


def get_authorized_membership(
    consultorio_id: int = Header(alias="X-Consultorio-Id"),
    current_psicologo: Psicologo = Depends(get_current_psicologo),
    db: Session = Depends(get_db),
) -> PsicologoConsultorio:
    vinculo = db.scalar(
        select(PsicologoConsultorio).where(
            PsicologoConsultorio.psicologo_id == current_psicologo.id,
            PsicologoConsultorio.consultorio_id == consultorio_id,
            PsicologoConsultorio.estado == EstadoVinculacion.AUTORIZADO,
        )
    )
    if vinculo is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No autorizado para operar en este consultorio",
        )
    return vinculo


def get_admin_membership(
    membership: PsicologoConsultorio = Depends(get_authorized_membership),
) -> PsicologoConsultorio:
    if membership.rol != RolConsultorio.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Requiere rol administrador")
    return membership
