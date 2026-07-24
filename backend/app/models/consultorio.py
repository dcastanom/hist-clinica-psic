from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, Boolean, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.clinical import Paciente, RegistroEnvioHistoria
    from app.models.psicologo import PsicologoConsultorio


class Consultorio(TimestampMixin, Base):
    __tablename__ = "consultorios"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    nit: Mapped[str] = mapped_column(String(30), nullable=False, unique=True)
    nombre: Mapped[str] = mapped_column(String(150), nullable=False)
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="1")

    psicologos: Mapped[list["PsicologoConsultorio"]] = relationship(
        back_populates="consultorio", cascade="all, delete-orphan"
    )
    pacientes: Mapped[list["Paciente"]] = relationship(back_populates="consultorio")
    envios_historia: Mapped[list["RegistroEnvioHistoria"]] = relationship(
        back_populates="consultorio"
    )

