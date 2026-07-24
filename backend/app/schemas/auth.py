from pydantic import BaseModel, EmailStr, Field

from app.models.enums import EstadoVinculacion, RolConsultorio


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class PsicologoRegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    consultorio_id: int
    solicita_admin: bool = False


class PsicologoUpdateRequest(BaseModel):
    nombre: str | None = Field(default=None, min_length=2, max_length=150)
    cedula: str | None = Field(default=None, min_length=3, max_length=30)
    especialidad: str | None = Field(default=None, max_length=150)
    tarjeta_profesional: str | None = Field(default=None, max_length=80)
    telefono_contacto: str | None = Field(default=None, max_length=30)


class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class PsicologoResponse(BaseModel):
    id: int
    cedula: str
    nombre: str
    email: EmailStr
    especialidad: str | None = None
    tarjeta_profesional: str | None = None
    telefono_contacto: str | None = None
    avatar_url: str | None = None
    activo: bool

    model_config = {"from_attributes": True}


class ConsultorioPublicResponse(BaseModel):
    id: int
    nit: str
    nombre: str

    model_config = {"from_attributes": True}


class ConsultorioMembershipResponse(BaseModel):
    vinculo_id: int
    consultorio_id: int
    nit: str
    nombre: str
    rol: RolConsultorio
    estado: EstadoVinculacion


class RegisterResponse(BaseModel):
    psicologo: PsicologoResponse
    consultorio: ConsultorioMembershipResponse


class PendingMembershipResponse(BaseModel):
    vinculo_id: int
    psicologo_id: int
    consultorio_id: int
    psicologo_nombre: str
    psicologo_email: EmailStr
    psicologo_cedula: str
    rol_solicitado: RolConsultorio
    estado: EstadoVinculacion
