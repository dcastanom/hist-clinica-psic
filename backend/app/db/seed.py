from datetime import datetime, timezone

from sqlalchemy import select

from app.core.config import settings
from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models import Consultorio, EstadoVinculacion, Psicologo, PsicologoConsultorio, RolConsultorio


def seed() -> None:
    db = SessionLocal()
    try:
        consultorio = db.scalar(
            select(Consultorio).where(Consultorio.nit == settings.seed_consultorio_nit)
        )
        if consultorio is None:
            consultorio = Consultorio(
                nit=settings.seed_consultorio_nit,
                nombre=settings.seed_consultorio_nombre,
            )
            db.add(consultorio)
            db.flush()

        admin = db.scalar(select(Psicologo).where(Psicologo.email == settings.seed_admin_email))
        if admin is None:
            admin = Psicologo(
                cedula=settings.seed_admin_cedula,
                nombre=settings.seed_admin_nombre,
                email=settings.seed_admin_email,
                password_hash=hash_password(settings.seed_admin_password),
            )
            db.add(admin)
            db.flush()

        vinculo = db.scalar(
            select(PsicologoConsultorio).where(
                PsicologoConsultorio.psicologo_id == admin.id,
                PsicologoConsultorio.consultorio_id == consultorio.id,
            )
        )
        if vinculo is None:
            vinculo = PsicologoConsultorio(
                psicologo_id=admin.id,
                consultorio_id=consultorio.id,
                rol=RolConsultorio.ADMIN,
                estado=EstadoVinculacion.AUTORIZADO,
                autorizado_por_id=admin.id,
                autorizado_at=datetime.now(timezone.utc).replace(tzinfo=None),
            )
            db.add(vinculo)

        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    seed()
    print("Seed inicial aplicado")
