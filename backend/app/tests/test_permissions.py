from app.tests.utils import auth_headers, crear_psicologo_autorizado, login, register_psicologo


def test_unauthenticated_user_cannot_access_clinical_endpoints(client, consultorio):
    response = client.get(
        "/api/v1/clinica/pacientes", headers={"X-Consultorio-Id": str(consultorio.id)}
    )
    assert response.status_code == 401


def test_pending_user_cannot_access_clinical_endpoints(client, consultorio):
    register_psicologo(client, email="pendiente@example.com", consultorio_id=consultorio.id)
    token = login(client, email="pendiente@example.com")
    response = client.get(
        "/api/v1/clinica/pacientes", headers=auth_headers(token, consultorio.id)
    )
    assert response.status_code == 403


def test_user_authorized_in_other_consultorio_is_blocked(client, db_session, consultorio, otro_consultorio):
    token = crear_psicologo_autorizado(
        client, db_session, consultorio_id=otro_consultorio.id, email="solo-otro@example.com"
    )
    response = client.get(
        "/api/v1/clinica/pacientes", headers=auth_headers(token, consultorio.id)
    )
    assert response.status_code == 403


def test_psicologo_cannot_access_paciente_ajeno(client, db_session, consultorio):
    token_a = crear_psicologo_autorizado(
        client, db_session, consultorio_id=consultorio.id, email="psi-a@example.com"
    )
    token_b = crear_psicologo_autorizado(
        client, db_session, consultorio_id=consultorio.id, email="psi-b@example.com"
    )

    creado = client.post(
        "/api/v1/clinica/pacientes",
        headers=auth_headers(token_a, consultorio.id),
        json={"nombre": "Paciente A", "documento_identidad": "111"},
    )
    assert creado.status_code == 201
    paciente_id = creado.json()["id"]

    ajeno_get = client.get(
        f"/api/v1/clinica/pacientes/{paciente_id}", headers=auth_headers(token_b, consultorio.id)
    )
    assert ajeno_get.status_code == 404

    ajeno_put = client.put(
        f"/api/v1/clinica/pacientes/{paciente_id}",
        headers=auth_headers(token_b, consultorio.id),
        json={"nombre": "Hackeado"},
    )
    assert ajeno_put.status_code == 404

    ajeno_delete = client.delete(
        f"/api/v1/clinica/pacientes/{paciente_id}", headers=auth_headers(token_b, consultorio.id)
    )
    assert ajeno_delete.status_code == 404

    listado_b = client.get("/api/v1/clinica/pacientes", headers=auth_headers(token_b, consultorio.id))
    assert listado_b.status_code == 200
    assert listado_b.json()["items"] == []


def test_psicologo_cannot_access_procesos_de_paciente_ajeno(client, db_session, consultorio):
    token_a = crear_psicologo_autorizado(
        client, db_session, consultorio_id=consultorio.id, email="psi-a2@example.com"
    )
    token_b = crear_psicologo_autorizado(
        client, db_session, consultorio_id=consultorio.id, email="psi-b2@example.com"
    )

    paciente = client.post(
        "/api/v1/clinica/pacientes",
        headers=auth_headers(token_a, consultorio.id),
        json={"nombre": "Paciente A2", "documento_identidad": "222"},
    ).json()

    proceso = client.post(
        f"/api/v1/clinica/pacientes/{paciente['id']}/procesos",
        headers=auth_headers(token_a, consultorio.id),
        json={"fecha_vinculacion": "2024-01-01"},
    ).json()

    intento_listar = client.get(
        f"/api/v1/clinica/pacientes/{paciente['id']}/procesos",
        headers=auth_headers(token_b, consultorio.id),
    )
    assert intento_listar.status_code == 404

    intento_crear = client.post(
        f"/api/v1/clinica/pacientes/{paciente['id']}/procesos",
        headers=auth_headers(token_b, consultorio.id),
        json={"fecha_vinculacion": "2024-02-01"},
    )
    assert intento_crear.status_code == 404

    intento_ver_proceso = client.get(
        f"/api/v1/clinica/procesos/{proceso['id']}", headers=auth_headers(token_b, consultorio.id)
    )
    assert intento_ver_proceso.status_code == 404


def test_admin_cannot_access_paciente_ajeno(client, db_session, consultorio):
    admin_token = crear_psicologo_autorizado(
        client,
        db_session,
        consultorio_id=consultorio.id,
        email="admin-sin-acceso@example.com",
        solicita_admin=True,
    )
    otro_token = crear_psicologo_autorizado(
        client, db_session, consultorio_id=consultorio.id, email="otro-psi@example.com"
    )

    creado = client.post(
        "/api/v1/clinica/pacientes",
        headers=auth_headers(otro_token, consultorio.id),
        json={"nombre": "Paciente Ajeno", "documento_identidad": "333"},
    )
    paciente_id = creado.json()["id"]

    response = client.get(
        f"/api/v1/clinica/pacientes/{paciente_id}", headers=auth_headers(admin_token, consultorio.id)
    )
    assert response.status_code == 404

    listado_admin = client.get(
        "/api/v1/clinica/pacientes", headers=auth_headers(admin_token, consultorio.id)
    )
    assert listado_admin.json()["items"] == []
