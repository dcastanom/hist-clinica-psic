from datetime import date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, Boolean, Date, DateTime, Enum, ForeignKey, Index, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin
from app.models.enums import EstadoCompromiso, EstadoEnvio, EstadoProceso, TipoDocumentoEnvio

if TYPE_CHECKING:
    from app.models.consultorio import Consultorio
    from app.models.psicologo import Psicologo


class Paciente(TimestampMixin, Base):
    __tablename__ = "pacientes"
    __table_args__ = (
        UniqueConstraint(
            "consultorio_id",
            "psicologo_id",
            "documento_identidad",
            name="uq_paciente_documento_por_psicologo",
        ),
        Index("idx_paciente_tenant_owner", "consultorio_id", "psicologo_id"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    consultorio_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("consultorios.id"), nullable=False)
    psicologo_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("psicologos.id"), nullable=False)
    nombre: Mapped[str] = mapped_column(String(150), nullable=False)
    documento_identidad: Mapped[str] = mapped_column(String(40), nullable=False)
    fecha_nacimiento: Mapped[date | None] = mapped_column(Date)
    escolaridad: Mapped[str | None] = mapped_column(String(120))
    direccion_casa: Mapped[str | None] = mapped_column(String(250))
    telefono_casa: Mapped[str | None] = mapped_column(String(30))
    telefono_celular: Mapped[str | None] = mapped_column(String(30))
    email: Mapped[str | None] = mapped_column(String(180))
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="1")

    consultorio: Mapped["Consultorio"] = relationship(back_populates="pacientes")
    psicologo: Mapped["Psicologo"] = relationship(back_populates="pacientes")
    procesos: Mapped[list["Proceso"]] = relationship(
        back_populates="paciente", cascade="all, delete-orphan"
    )
    envios_historia: Mapped[list["RegistroEnvioHistoria"]] = relationship(back_populates="paciente")


class Proceso(TimestampMixin, Base):
    __tablename__ = "procesos"
    __table_args__ = (Index("idx_proceso_paciente_estado", "paciente_id", "estado"),)

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    paciente_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("pacientes.id"), nullable=False)
    fecha_vinculacion: Mapped[date] = mapped_column(Date, nullable=False)
    motivo_consulta: Mapped[str | None] = mapped_column(Text)
    aspectos_historia_vida: Mapped[str | None] = mapped_column(Text)
    impresion_diagnostica: Mapped[str | None] = mapped_column(Text)
    logros_significativos: Mapped[str | None] = mapped_column(Text)
    cierre_proceso: Mapped[str | None] = mapped_column(Text)
    recomendaciones: Mapped[str | None] = mapped_column(Text)
    estado: Mapped[EstadoProceso] = mapped_column(
        Enum(EstadoProceso), nullable=False, default=EstadoProceso.ABIERTO
    )

    paciente: Mapped[Paciente] = relationship(back_populates="procesos")
    sesiones: Mapped[list["Sesion"]] = relationship(
        back_populates="proceso", cascade="all, delete-orphan"
    )


class Sesion(TimestampMixin, Base):
    __tablename__ = "sesiones"
    __table_args__ = (
        UniqueConstraint("proceso_id", "numero_sesion", name="uq_sesion_numero_por_proceso"),
        Index("idx_sesion_proceso_fecha", "proceso_id", "fecha_sesion"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    proceso_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("procesos.id"), nullable=False)
    fecha_sesion: Mapped[date] = mapped_column(Date, nullable=False)
    numero_sesion: Mapped[int] = mapped_column(nullable=False)
    notas_sesion: Mapped[str | None] = mapped_column(Text)

    proceso: Mapped[Proceso] = relationship(back_populates="sesiones")
    compromisos: Mapped[list["Compromiso"]] = relationship(
        back_populates="sesion", cascade="all, delete-orphan"
    )


class Compromiso(TimestampMixin, Base):
    __tablename__ = "compromisos"
    __table_args__ = (Index("idx_compromiso_sesion_estado", "sesion_id", "estado"),)

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    sesion_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("sesiones.id"), nullable=False)
    descripcion: Mapped[str] = mapped_column(Text, nullable=False)
    resultado_seguimiento: Mapped[str | None] = mapped_column(Text)
    estado: Mapped[EstadoCompromiso] = mapped_column(
        Enum(EstadoCompromiso), nullable=False, default=EstadoCompromiso.PENDIENTE
    )

    sesion: Mapped[Sesion] = relationship(back_populates="compromisos")


class RegistroEnvioHistoria(Base):
    __tablename__ = "registro_envio_historia"
    __table_args__ = (
        Index("idx_envio_paciente_fecha", "paciente_id", "enviado_at"),
        Index("idx_envio_tenant_owner", "consultorio_id", "psicologo_id"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    paciente_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("pacientes.id"), nullable=False)
    psicologo_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("psicologos.id"), nullable=False)
    consultorio_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("consultorios.id"), nullable=False)
    tipo_documento: Mapped[TipoDocumentoEnvio] = mapped_column(Enum(TipoDocumentoEnvio), nullable=False)
    email_destino: Mapped[str] = mapped_column(String(180), nullable=False)
    enviado_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    estado: Mapped[EstadoEnvio] = mapped_column(Enum(EstadoEnvio), nullable=False)
    error: Mapped[str | None] = mapped_column(Text)

    paciente: Mapped[Paciente] = relationship(back_populates="envios_historia")
    psicologo: Mapped["Psicologo"] = relationship(back_populates="envios_historia")
    consultorio: Mapped["Consultorio"] = relationship(back_populates="envios_historia")

