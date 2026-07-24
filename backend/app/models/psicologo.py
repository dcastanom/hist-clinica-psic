from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, Boolean, DateTime, Enum, ForeignKey, Index, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin
from app.models.enums import EstadoVinculacion, RolConsultorio

if TYPE_CHECKING:
    from app.models.clinical import Paciente, RegistroEnvioHistoria
    from app.models.consultorio import Consultorio


class Psicologo(TimestampMixin, Base):
    __tablename__ = "psicologos"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    cedula: Mapped[str] = mapped_column(String(30), nullable=False)
    nombre: Mapped[str] = mapped_column(String(150), nullable=False)
    especialidad: Mapped[str | None] = mapped_column(String(150))
    tarjeta_profesional: Mapped[str | None] = mapped_column(String(80))
    telefono_contacto: Mapped[str | None] = mapped_column(String(30))
    email: Mapped[str] = mapped_column(String(180), nullable=False, unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    avatar_url: Mapped[str | None] = mapped_column(String(500))
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="1")

    consultorios: Mapped[list["PsicologoConsultorio"]] = relationship(
        foreign_keys="PsicologoConsultorio.psicologo_id",
        back_populates="psicologo",
        cascade="all, delete-orphan",
    )
    autorizaciones_realizadas: Mapped[list["PsicologoConsultorio"]] = relationship(
        foreign_keys="PsicologoConsultorio.autorizado_por_id",
        back_populates="autorizado_por",
    )
    pacientes: Mapped[list["Paciente"]] = relationship(back_populates="psicologo")
    envios_historia: Mapped[list["RegistroEnvioHistoria"]] = relationship(back_populates="psicologo")


class PsicologoConsultorio(TimestampMixin, Base):
    __tablename__ = "psicologo_consultorio"
    __table_args__ = (
        UniqueConstraint("psicologo_id", "consultorio_id", name="uq_pc_psicologo_consultorio"),
        Index("idx_pc_consultorio_estado", "consultorio_id", "estado"),
        Index("idx_pc_psicologo_estado", "psicologo_id", "estado"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    psicologo_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("psicologos.id"), nullable=False)
    consultorio_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("consultorios.id"), nullable=False)
    rol: Mapped[RolConsultorio] = mapped_column(
        Enum(RolConsultorio), nullable=False, default=RolConsultorio.PSICOLOGO
    )
    estado: Mapped[EstadoVinculacion] = mapped_column(
        Enum(EstadoVinculacion), nullable=False, default=EstadoVinculacion.PENDIENTE
    )
    autorizado_por_id: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("psicologos.id"))
    autorizado_at: Mapped[datetime | None] = mapped_column(DateTime)

    psicologo: Mapped[Psicologo] = relationship(
        foreign_keys=[psicologo_id], back_populates="consultorios"
    )
    consultorio: Mapped["Consultorio"] = relationship(back_populates="psicologos")
    autorizado_por: Mapped[Psicologo | None] = relationship(
        foreign_keys=[autorizado_por_id], back_populates="autorizaciones_realizadas"
    )

