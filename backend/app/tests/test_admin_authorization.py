from app.tests.utils import auth_headers, autorizar_directo, login, register_psicologo


def test_admin_can_list_and_authorize_pending(client, db_session, consultorio):
    admin_data = register_psicologo(
        client, email="admin@example.com", consultorio_id=consultorio.id, solicita_admin=True
    )
    autorizar_directo(db_session, admin_data["consultorio"]["vinculo_id"])
    admin_token = login(client, email="admin@example.com")

    nuevo = register_psicologo(client, email="nuevo@example.com", consultorio_id=consultorio.id)

    response = client.get(
        "/api/v1/admin/solicitudes", headers=auth_headers(admin_token, consultorio.id)
    )
    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]["psicologo_email"] == "nuevo@example.com"

    autorizar = client.post(
        f"/api/v1/admin/solicitudes/{nuevo['consultorio']['vinculo_id']}/autorizar",
        headers=auth_headers(admin_token, consultorio.id),
    )
    assert autorizar.status_code == 200
    assert autorizar.json()["estado"] == "AUTORIZADO"

    pendientes = client.get(
        "/api/v1/admin/solicitudes", headers=auth_headers(admin_token, consultorio.id)
    )
    assert pendientes.json() == []


def test_admin_can_reject_pending(client, db_session, consultorio):
    admin_data = register_psicologo(
        client, email="admin@example.com", consultorio_id=consultorio.id, solicita_admin=True
    )
    autorizar_directo(db_session, admin_data["consultorio"]["vinculo_id"])
    admin_token = login(client, email="admin@example.com")

    nuevo = register_psicologo(client, email="rechazado@example.com", consultorio_id=consultorio.id)

    rechazar = client.post(
        f"/api/v1/admin/solicitudes/{nuevo['consultorio']['vinculo_id']}/rechazar",
        headers=auth_headers(admin_token, consultorio.id),
    )
    assert rechazar.status_code == 200
    assert rechazar.json()["estado"] == "RECHAZADO"


def test_admin_authorize_second_admin_conflicts(client, db_session, consultorio):
    # Ambas solicitudes de administrador se registran mientras ninguna esta
    # autorizada todavia: el registro solo bloquea un segundo admin cuando ya
    # existe uno AUTORIZADO, no cuando el primero sigue pendiente.
    admin_data = register_psicologo(
        client, email="admin@example.com", consultorio_id=consultorio.id, solicita_admin=True
    )
    otro_admin = register_psicologo(
        client, email="otro-admin@example.com", consultorio_id=consultorio.id, solicita_admin=True
    )

    autorizar_directo(db_session, admin_data["consultorio"]["vinculo_id"])
    admin_token = login(client, email="admin@example.com")

    response = client.post(
        f"/api/v1/admin/solicitudes/{otro_admin['consultorio']['vinculo_id']}/autorizar",
        headers=auth_headers(admin_token, consultorio.id),
    )
    assert response.status_code == 409


def test_non_admin_cannot_access_admin_endpoints(client, db_session, consultorio):
    psicologo_data = register_psicologo(
        client, email="normal@example.com", consultorio_id=consultorio.id
    )
    autorizar_directo(db_session, psicologo_data["consultorio"]["vinculo_id"])
    token = login(client, email="normal@example.com")

    response = client.get(
        "/api/v1/admin/solicitudes", headers=auth_headers(token, consultorio.id)
    )
    assert response.status_code == 403


def test_admin_cannot_authorize_in_other_consultorio(client, db_session, consultorio, otro_consultorio):
    admin_data = register_psicologo(
        client, email="admin@example.com", consultorio_id=consultorio.id, solicita_admin=True
    )
    autorizar_directo(db_session, admin_data["consultorio"]["vinculo_id"])
    admin_token = login(client, email="admin@example.com")

    ajeno = register_psicologo(client, email="ajeno@example.com", consultorio_id=otro_consultorio.id)

    response = client.post(
        f"/api/v1/admin/solicitudes/{ajeno['consultorio']['vinculo_id']}/autorizar",
        headers=auth_headers(admin_token, consultorio.id),
    )
    assert response.status_code == 404
