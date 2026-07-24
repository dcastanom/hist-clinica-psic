from app.tests.utils import login, register_psicologo


def test_login_success_and_me(client, consultorio):
    register_psicologo(client, email="login@example.com", consultorio_id=consultorio.id)
    token = login(client, email="login@example.com")
    response = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json()["email"] == "login@example.com"


def test_login_wrong_password_fails(client, consultorio):
    register_psicologo(client, email="login2@example.com", consultorio_id=consultorio.id)
    response = client.post(
        "/api/v1/auth/login", json={"email": "login2@example.com", "password": "incorrecta"}
    )
    assert response.status_code == 401


def test_login_unknown_email_fails(client):
    response = client.post(
        "/api/v1/auth/login", json={"email": "no-existe@example.com", "password": "cualquiera"}
    )
    assert response.status_code == 401


def test_me_without_token_is_401(client):
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401


def test_me_with_invalid_token_is_401(client):
    response = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer token-invalido"})
    assert response.status_code == 401


def test_mis_consultorios_lists_membership(client, consultorio):
    register_psicologo(client, email="lista@example.com", consultorio_id=consultorio.id)
    token = login(client, email="lista@example.com")
    response = client.get(
        "/api/v1/auth/consultorios", headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["estado"] == "PENDIENTE"
    assert body[0]["consultorio_id"] == consultorio.id
