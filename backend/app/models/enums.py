from enum import StrEnum


class RolConsultorio(StrEnum):
    ADMIN = "ADMIN"
    PSICOLOGO = "PSICOLOGO"


class EstadoVinculacion(StrEnum):
    PENDIENTE = "PENDIENTE"
    AUTORIZADO = "AUTORIZADO"
    RECHAZADO = "RECHAZADO"
    INACTIVO = "INACTIVO"


class EstadoProceso(StrEnum):
    ABIERTO = "ABIERTO"
    CERRADO = "CERRADO"


class EstadoCompromiso(StrEnum):
    PENDIENTE = "PENDIENTE"
    EN_SEGUIMIENTO = "EN_SEGUIMIENTO"
    CUMPLIDO = "CUMPLIDO"
    NO_CUMPLIDO = "NO_CUMPLIDO"


class TipoDocumentoEnvio(StrEnum):
    RESUMEN_SESIONES = "RESUMEN_SESIONES"
    RESUMEN_PROCESO = "RESUMEN_PROCESO"
    HISTORIA_COMPLETA = "HISTORIA_COMPLETA"


class EstadoEnvio(StrEnum):
    ENVIADO = "ENVIADO"
    FALLIDO = "FALLIDO"
