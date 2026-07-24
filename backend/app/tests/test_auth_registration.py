from app.tests.utils import autorizar_directo, register_psicologo


def test_register_creates_pending_membership(client, consultorio):
    data = register_psicologo(client, email="nuevo@example.com", consultorio_id=consultorio.id)
    assert data["consultorio"]["estado"] == "PENDIENTE"
    assert data["consultorio"]["rol"] == "PSICOLOGO"
    assert data["psicologo"]["email"] == "nuevo@example.com"


def test_register_unknown_consultorio_returns_404(client):
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "nadie@example.com",
            "password": "Password123!",
            "consultorio_id": 999999,
        },
    )
    assert response.status_code == 404


def test_register_duplicate_membership_conflicts(client, consultorio):
    register_psicologo(client, email="dup@example.com", consultorio_id=consultorio.id)
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "dup@example.com",
            "password": "Password123!",
            "consultorio_id": consultorio.id,
        },
    )
    assert response.status_code == 409


def test_existing_psicologo_can_join_second_consultorio(client, consultorio, otro_consultorio):
    register_psicologo(client, email="multi@example.com", consultorio_id=consultorio.id)
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "multi@example.com",
            "password": "Password123!",
            "consultorio_id": otro_consultorio.id,
        },
    )
    assert response.status_code == 201
    assert response.json()["consultorio"]["consultorio_id"] == otro_consultorio.id


def test_register_second_admin_conflicts_when_first_authorized(client, db_session, consultorio):
    admin_data = register_psicologo(
        client, email="admin1@example.com", consultorio_id=consultorio.id, solicita_admin=True
    )
    autorizar_directo(db_session, admin_data["consultorio"]["vinculo_id"])

    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "admin2@example.com",
            "password": "Password123!",
            "consultorio_id": consultorio.id,
            "solicita_admin": True,
        },
    )
    assert response.status_code == 409


def test_register_second_admin_allowed_while_first_still_pending(client, consultorio):
    register_psicologo(
        client, email="admin1@example.com", consultorio_id=consultorio.id, solicita_admin=True
    )
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "admin2@example.com",
            "password": "Password123!",
            "consultorio_id": consultorio.id,
            "solicita_admin": True,
        },
    )
    assert response.status_code == 201
    assert response.json()["consultorio"]["estado"] == "PENDIENTE"
