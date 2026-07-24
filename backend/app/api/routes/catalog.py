from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models import Consultorio
from app.schemas.auth import ConsultorioPublicResponse

router = APIRouter(tags=["catalog"])


@router.get("/consultorios", response_model=list[ConsultorioPublicResponse])
def list_consultorios_publicos(db: Session = Depends(get_db)) -> list[Consultorio]:
    return list(
        db.scalars(
            select(Consultorio).where(Consultorio.activo.is_(True)).order_by(Consultorio.nombre)
        ).all()
    )
