from datetime import date, datetime

from pydantic import BaseModel, EmailStr, Field

from app.models.enums import EstadoCompromiso, EstadoEnvio, EstadoProceso, TipoDocumentoEnvio


class PacienteBase(BaseModel):
    nombre: str = Field(min_length=2, max_length=150)
    documento_identidad: str = Field(min_length=3, max_length=40)
    fecha_nacimiento: date | None = None
    escolaridad: str | None = Field(default=None, max_length=120)
    direccion_casa: str | None = Field(default=None, max_length=250)
    telefono_casa: str | None = Field(default=None, max_length=30)
    telefono_celular: str | None = Field(default=None, max_length=30)
    email: EmailStr | None = None


class PacienteCreate(PacienteBase):
    pass


class PacienteUpdate(BaseModel):
    nombre: str | None = Field(default=None, min_length=2, max_length=150)
    documento_identidad: str | None = Field(default=None, min_length=3, max_length=40)
    fecha_nacimiento: date | None = None
    escolaridad: str | None = Field(default=None, max_length=120)
    direccion_casa: str | None = Field(default=None, max_length=250)
    telefono_casa: str | None = Field(default=None, max_length=30)
    telefono_celular: str | None = Field(default=None, max_length=30)
    email: EmailStr | None = None
    activo: bool | None = None


class PacienteResponse(PacienteBase):
    id: int
    consultorio_id: int
    psicologo_id: int
    edad: int | None = None
    activo: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ProcesoBase(BaseModel):
    fecha_vinculacion: date
    motivo_consulta: str | None = None
    aspectos_historia_vida: str | None = None
    impresion_diagnostica: str | None = None
    logros_significativos: str | None = None
    cierre_proceso: str | None = None
    recomendaciones: str | None = None
    estado: EstadoProceso = EstadoProceso.ABIERTO


class ProcesoCreate(ProcesoBase):
    pass


class ProcesoUpdate(BaseModel):
    fecha_vinculacion: date | None = None
    motivo_consulta: str | None = None
    aspectos_historia_vida: str | None = None
    impresion_diagnostica: str | None = None
    logros_significativos: str | None = None
    cierre_proceso: str | None = None
    recomendaciones: str | None = None
    estado: EstadoProceso | None = None


class ProcesoResponse(ProcesoBase):
    id: int
    paciente_id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class SesionBase(BaseModel):
    fecha_sesion: date
    numero_sesion: int = Field(ge=1)
    notas_sesion: str | None = None


class SesionCreate(SesionBase):
    pass


class SesionUpdate(BaseModel):
    fecha_sesion: date | None = None
    numero_sesion: int | None = Field(default=None, ge=1)
    notas_sesion: str | None = None


class SesionResponse(SesionBase):
    id: int
    proceso_id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CompromisoBase(BaseModel):
    descripcion: str = Field(min_length=1)
    resultado_seguimiento: str | None = None
    estado: EstadoCompromiso = EstadoCompromiso.PENDIENTE


class CompromisoCreate(CompromisoBase):
    pass


class CompromisoUpdate(BaseModel):
    descripcion: str | None = Field(default=None, min_length=1)
    resultado_seguimiento: str | None = None
    estado: EstadoCompromiso | None = None


class CompromisoResponse(CompromisoBase):
    id: int
    sesion_id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class SesionHistoriaResponse(SesionResponse):
    compromisos: list[CompromisoResponse] = []


class ProcesoHistoriaResponse(ProcesoResponse):
    sesiones: list[SesionHistoriaResponse] = []


class HistoriaClinicaResponse(BaseModel):
    paciente: PacienteResponse
    procesos: list[ProcesoHistoriaResponse]


class EnvioHistoriaCreate(BaseModel):
    tipo_documento: TipoDocumentoEnvio
    email_destino: EmailStr


class RegistroEnvioHistoriaResponse(BaseModel):
    id: int
    paciente_id: int
    psicologo_id: int
    consultorio_id: int
    tipo_documento: TipoDocumentoEnvio
    email_destino: EmailStr
    enviado_at: datetime
    estado: EstadoEnvio
    error: str | None = None

    model_config = {"from_attributes": True}
