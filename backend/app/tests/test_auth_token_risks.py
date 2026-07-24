from datetime import datetime, timedelta, timezone

from jose import jwt
from sqlalchemy import select

from app.core.security import ALGORITHM
from app.core.config import settings
from app.models import Psicologo
from app.tests.utils import login, register_psicologo


def test_expired_token_is_rejected(client, consultorio):
    data = register_psicologo(client, email="expirado@example.com", consultorio_id=consultorio.id)
    psicologo_id = data["psicologo"]["id"]

    expirado = datetime.now(timezone.utc) - timedelta(minutes=1)
    token = jwt.encode({"sub": str(psicologo_id), "exp": expirado}, settings.secret_key, algorithm=ALGORITHM)

    response = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 401


def test_token_firmado_con_clave_incorrecta_es_rechazado(client, consultorio):
    data = register_psicologo(client, email="firma-mala@example.com", consultorio_id=consultorio.id)
    psicologo_id = data["psicologo"]["id"]

    vigente = datetime.now(timezone.utc) + timedelta(minutes=30)
    token = jwt.encode({"sub": str(psicologo_id), "exp": vigente}, "otra-clave-distinta", algorithm=ALGORITHM)

    response = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 401


def test_psicologo_desactivado_no_puede_usar_token_vigente(client, db_session, consultorio):
    register_psicologo(client, email="se-desactiva@example.com", consultorio_id=consultorio.id)
    token = login(client, email="se-desactiva@example.com")

    respuesta_previa = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert respuesta_previa.status_code == 200

    entidad = db_session.scalar(
        select(Psicologo).where(Psicologo.email == "se-desactiva@example.com")
    )
    entidad.activo = False
    db_session.commit()

    respuesta_tras_desactivar = client.get(
        "/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"}
    )
    assert respuesta_tras_desactivar.status_code == 401


def test_login_de_psicologo_desactivado_devuelve_403(client, db_session, consultorio):
    register_psicologo(
        client,
        email="login-desactivado@example.com",
        consultorio_id=consultorio.id,
    )

    entidad = db_session.scalar(
        select(Psicologo).where(Psicologo.email == "login-desactivado@example.com")
    )
    entidad.activo = False
    db_session.commit()

    response = client.post(
        "/api/v1/auth/login",
        json={"email": "login-desactivado@example.com", "password": "Password123!"},
    )
    assert response.status_code == 403
