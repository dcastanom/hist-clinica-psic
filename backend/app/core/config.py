from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Historia Clinica Psicologica"
    environment: str = "local"
    debug: bool = False

    backend_host: str = "0.0.0.0"
    backend_port: int = 8000

    database_url: str = "mysql+pymysql://hist_user:hist_password@localhost:3306/hist_clinica_psic"

    secret_key: str = "change-me"
    access_token_expire_minutes: int = 120
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    seed_admin_email: str = "admin@example.com"
    seed_admin_password: str = "Admin12345!"
    seed_admin_nombre: str = "Administrador Demo"
    seed_admin_cedula: str = "1000000000"
    seed_consultorio_nit: str = "900000000-1"
    seed_consultorio_nombre: str = "Consultorio Demo"

    mail_from: str = "no-reply@example.com"
    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_user: str | None = None
    smtp_password: str | None = None
    smtp_tls: bool = True

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def cors_origin_list(self) -> list[str]:
        # El navegador manda el header Origin sin barra final; si CORS_ORIGINS
        # trae una barra final por error de configuracion, la comparacion
        # exacta de CORSMiddleware nunca coincide y bloquea todo en silencio.
        return [
            origin.strip().rstrip("/")
            for origin in self.cors_origins.split(",")
            if origin.strip()
        ]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
