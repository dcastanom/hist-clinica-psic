from app.tests.utils import auth_headers, login, register_psicologo


def _registrar_y_loguear(client, consultorio, email="perfil@example.com"):
    register_psicologo(client, email=email, consultorio_id=consultorio.id)
    token = login(client, email=email)
    return token


def test_update_me_actualiza_campos_parcialmente(client, consultorio):
    token = _registrar_y_loguear(client, consultorio, email="parcial@example.com")
    headers = auth_headers(token)

    primero = client.put(
        "/api/v1/auth/me",
        headers=headers,
        json={"nombre": "Ana Terapeuta", "cedula": "1234567"},
    )
    assert primero.status_code == 200
    body = primero.json()
    assert body["nombre"] == "Ana Terapeuta"
    assert body["cedula"] == "1234567"
    assert body["especialidad"] is None

    segundo = client.put(
        "/api/v1/auth/me",
        headers=headers,
        json={"especialidad": "Psicologia clinica"},
    )
    assert segundo.status_code == 200
    body2 = segundo.json()
    assert body2["nombre"] == "Ana Terapeuta"
    assert body2["especialidad"] == "Psicologia clinica"


def test_update_me_actualiza_todos_los_campos(client, consultorio):
    token = _registrar_y_loguear(client, consultorio, email="completo@example.com")
    headers = auth_headers(token)

    response = client.put(
        "/api/v1/auth/me",
        headers=headers,
        json={
            "nombre": "Carlos Perez",
            "cedula": "9998887",
            "especialidad": "Neuropsicologia",
            "tarjeta_profesional": "TP-123",
            "telefono_contacto": "3000000000",
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["nombre"] == "Carlos Perez"
    assert body["cedula"] == "9998887"
    assert body["especialidad"] == "Neuropsicologia"
    assert body["tarjeta_profesional"] == "TP-123"
    assert body["telefono_contacto"] == "3000000000"


def test_update_me_sin_autenticacion_es_401(client):
    response = client.put("/api/v1/auth/me", json={"nombre": "Nadie"})
    assert response.status_code == 401


def test_update_me_con_datos_invalidos_es_422(client, consultorio):
    token = _registrar_y_loguear(client, consultorio, email="invalido@example.com")
    headers = auth_headers(token)

    response = client.put("/api/v1/auth/me", headers=headers, json={"nombre": "A"})
    assert response.status_code == 422


def test_change_password_exitoso(client, consultorio):
    email = "cambia-password@example.com"
    token = _registrar_y_loguear(client, consultorio, email=email)
    headers = auth_headers(token)

    response = client.put(
        "/api/v1/auth/me/password",
        headers=headers,
        json={"current_password": "Password123!", "new_password": "NuevaClave456!"},
    )
    assert response.status_code == 204

    login_viejo = client.post(
        "/api/v1/auth/login", json={"email": email, "password": "Password123!"}
    )
    assert login_viejo.status_code == 401

    login_nuevo = client.post(
        "/api/v1/auth/login", json={"email": email, "password": "NuevaClave456!"}
    )
    assert login_nuevo.status_code == 200


def test_change_password_con_contrasena_actual_incorrecta_es_400(client, consultorio):
    token = _registrar_y_loguear(client, consultorio, email="clave-mala@example.com")
    headers = auth_headers(token)

    response = client.put(
        "/api/v1/auth/me/password",
        headers=headers,
        json={"current_password": "NoEsLaClave1!", "new_password": "NuevaClave456!"},
    )
    assert response.status_code == 400


def test_change_password_con_nueva_clave_invalida_es_422(client, consultorio):
    token = _registrar_y_loguear(client, consultorio, email="clave-corta@example.com")
    headers = auth_headers(token)

    response = client.put(
        "/api/v1/auth/me/password",
        headers=headers,
        json={"current_password": "Password123!", "new_password": "corta"},
    )
    assert response.status_code == 422


def test_change_password_sin_autenticacion_es_401(client):
    response = client.put(
        "/api/v1/auth/me/password",
        json={"current_password": "Password123!", "new_password": "NuevaClave456!"},
    )
    assert response.status_code == 401


def test_change_password_el_token_anterior_sigue_valido_de_inmediato(client, consultorio):
    """Confirma en codigo el analisis de CONTROLES-DE-CAMBIOS.md: el JWT es
    stateless y no se revalida contra la contrasena, asi que el mismo token
    sigue funcionando justo despues de cambiar la contrasena."""
    email = "token-sigue-valido@example.com"
    token = _registrar_y_loguear(client, consultorio, email=email)
    headers = auth_headers(token)

    cambio = client.put(
        "/api/v1/auth/me/password",
        headers=headers,
        json={"current_password": "Password123!", "new_password": "NuevaClave456!"},
    )
    assert cambio.status_code == 204

    me = client.get("/api/v1/auth/me", headers=headers)
    assert me.status_code == 200
    assert me.json()["email"] == email
