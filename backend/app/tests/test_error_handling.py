from fastapi.testclient import TestClient

from app.db.session import get_db
from app.main import create_app
from app.tests.utils import auth_headers, crear_psicologo_autorizado


def _headers_psicologo(client, db_session, consultorio, email="clinico-riesgo@example.com"):
    token = crear_psicologo_autorizado(
        client, db_session, consultorio_id=consultorio.id, email=email
    )
    return auth_headers(token, consultorio.id)


def test_unhandled_exception_does_not_leak_traceback_when_debug_false(
    monkeypatch, session_factory
):
    from app.core.config import settings

    monkeypatch.setattr(settings, "debug", False)
    app = create_app()

    def broken_db():
        raise RuntimeError("boom - fallo simulado de conexion a base de datos")
        yield  # pragma: no cover - nunca se alcanza

    app.dependency_overrides[get_db] = broken_db
    with TestClient(app, raise_server_exceptions=False) as broken_client:
        response = broken_client.get("/api/v1/consultorios")

    assert response.status_code == 500
    assert "boom - fallo simulado" not in response.text
    assert "Traceback" not in response.text
    assert "RuntimeError" not in response.text


def test_missing_consultorio_header_returns_422(client, db_session, consultorio):
    headers = _headers_psicologo(client, db_session, consultorio)
    headers.pop("X-Consultorio-Id")

    response = client.get("/api/v1/clinica/pacientes", headers=headers)
    assert response.status_code == 422


def test_non_numeric_consultorio_header_returns_422(client, db_session, consultorio):
    headers = _headers_psicologo(client, db_session, consultorio)
    headers["X-Consultorio-Id"] = "no-es-un-numero"

    response = client.get("/api/v1/clinica/pacientes", headers=headers)
    assert response.status_code == 422


def test_non_numeric_path_param_returns_422(client, db_session, consultorio):
    headers = _headers_psicologo(client, db_session, consultorio)

    response = client.get("/api/v1/clinica/pacientes/no-es-un-id", headers=headers)
    assert response.status_code == 422


def test_malformed_json_body_returns_422_not_500(client, db_session, consultorio):
    headers = _headers_psicologo(client, db_session, consultorio)
    headers["Content-Type"] = "application/json"

    response = client.post(
        "/api/v1/clinica/pacientes", headers=headers, content=b'{"nombre": "sin cerrar"'
    )
    assert response.status_code == 422


def test_numero_sesion_invalido_returns_422(client, db_session, consultorio):
    headers = _headers_psicologo(client, db_session, consultorio)
    paciente = client.post(
        "/api/v1/clinica/pacientes",
        headers=headers,
        json={"nombre": "Paciente Sesion Invalida", "documento_identidad": "9001"},
    ).json()
    proceso = client.post(
        f"/api/v1/clinica/pacientes/{paciente['id']}/procesos",
        headers=headers,
        json={"fecha_vinculacion": "2024-01-01"},
    ).json()

    response = client.post(
        f"/api/v1/clinica/procesos/{proceso['id']}/sesiones",
        headers=headers,
        json={"fecha_sesion": "2024-01-10", "numero_sesion": 0},
    )
    assert response.status_code == 422

    response_negativo = client.post(
        f"/api/v1/clinica/procesos/{proceso['id']}/sesiones",
        headers=headers,
        json={"fecha_sesion": "2024-01-10", "numero_sesion": -1},
    )
    assert response_negativo.status_code == 422


def test_email_invalido_al_crear_paciente_returns_422(client, db_session, consultorio):
    headers = _headers_psicologo(client, db_session, consultorio)

    response = client.post(
        "/api/v1/clinica/pacientes",
        headers=headers,
        json={
            "nombre": "Paciente Email Invalido",
            "documento_identidad": "9002",
            "email": "no-es-un-email",
        },
    )
    assert response.status_code == 422


def test_email_invalido_al_enviar_historia_returns_422(client, db_session, consultorio):
    headers = _headers_psicologo(client, db_session, consultorio)
    paciente = client.post(
        "/api/v1/clinica/pacientes",
        headers=headers,
        json={"nombre": "Paciente Envio Invalido", "documento_identidad": "9003"},
    ).json()

    response = client.post(
        f"/api/v1/clinica/pacientes/{paciente['id']}/envios",
        headers=headers,
        json={"tipo_documento": "HISTORIA_COMPLETA", "email_destino": "no-es-un-email"},
    )
    assert response.status_code == 422


def test_crear_proceso_sobre_paciente_desactivado_returns_404(client, db_session, consultorio):
    headers = _headers_psicologo(client, db_session, consultorio)
    paciente = client.post(
        "/api/v1/clinica/pacientes",
        headers=headers,
        json={"nombre": "Paciente Desactivado", "documento_identidad": "9004"},
    ).json()

    eliminado = client.delete(f"/api/v1/clinica/pacientes/{paciente['id']}", headers=headers)
    assert eliminado.status_code == 204

    response = client.post(
        f"/api/v1/clinica/pacientes/{paciente['id']}/procesos",
        headers=headers,
        json={"fecha_vinculacion": "2024-01-01"},
    )
    assert response.status_code == 404


def test_envio_historia_con_smtp_caido_se_registra_como_fallido(
    monkeypatch, client, db_session, consultorio
):
    from app.api.routes import clinical as clinical_routes
    from app.services.mail import MailResult

    def smtp_caido(to_email, subject, body):
        return MailResult(sent=False, error="No se pudo conectar con el servidor SMTP")

    monkeypatch.setattr(clinical_routes, "send_mail", smtp_caido)

    headers = _headers_psicologo(client, db_session, consultorio)
    paciente = client.post(
        "/api/v1/clinica/pacientes",
        headers=headers,
        json={"nombre": "Paciente Correo Caido", "documento_identidad": "9005"},
    ).json()

    response = client.post(
        f"/api/v1/clinica/pacientes/{paciente['id']}/envios",
        headers=headers,
        json={"tipo_documento": "HISTORIA_COMPLETA", "email_destino": "destino@example.com"},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["estado"] == "FALLIDO"
    assert body["error"] == "No se pudo conectar con el servidor SMTP"
