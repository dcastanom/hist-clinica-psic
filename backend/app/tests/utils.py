from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import EstadoVinculacion, PsicologoConsultorio

DEFAULT_PASSWORD = "Password123!"


def register_psicologo(
    client: TestClient,
    *,
    email: str,
    consultorio_id: int,
    password: str = DEFAULT_PASSWORD,
    solicita_admin: bool = False,
) -> dict:
    payload = {
        "email": email,
        "password": password,
        "consultorio_id": consultorio_id,
        "solicita_admin": solicita_admin,
    }
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201, response.text
    return response.json()


def login(client: TestClient, *, email: str, password: str = DEFAULT_PASSWORD) -> str:
    response = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200, response.text
    return response.json()["access_token"]


def auth_headers(token: str, consultorio_id: int | None = None) -> dict:
    headers = {"Authorization": f"Bearer {token}"}
    if consultorio_id is not None:
        headers["X-Consultorio-Id"] = str(consultorio_id)
    return headers


def autorizar_directo(db_session: Session, vinculo_id: int, rol: str | None = None) -> None:
    vinculo = db_session.get(PsicologoConsultorio, vinculo_id)
    vinculo.estado = EstadoVinculacion.AUTORIZADO
    if rol is not None:
        vinculo.rol = rol
    db_session.commit()


def crear_psicologo_autorizado(
    client: TestClient,
    db_session: Session,
    *,
    consultorio_id: int,
    email: str,
    solicita_admin: bool = False,
) -> str:
    data = register_psicologo(
        client, email=email, consultorio_id=consultorio_id, solicita_admin=solicita_admin
    )
    autorizar_directo(db_session, data["consultorio"]["vinculo_id"])
    return login(client, email=email)
