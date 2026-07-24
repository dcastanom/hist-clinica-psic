from app.tests.utils import auth_headers, crear_psicologo_autorizado


def _headers_psicologo(client, db_session, consultorio, email="paginacion@example.com"):
    token = crear_psicologo_autorizado(
        client, db_session, consultorio_id=consultorio.id, email=email
    )
    return auth_headers(token, consultorio.id)


def _crear_paciente(client, headers, nombre, documento):
    response = client.post(
        "/api/v1/clinica/pacientes",
        headers=headers,
        json={"nombre": nombre, "documento_identidad": documento},
    )
    assert response.status_code == 201, response.text
    return response.json()


def test_pagination_returns_correct_page_and_metadata(client, db_session, consultorio):
    headers = _headers_psicologo(client, db_session, consultorio)
    for i in range(25):
        _crear_paciente(client, headers, f"Paciente {i:02d}", f"DOC-{i:02d}")

    pagina_1 = client.get(
        "/api/v1/clinica/pacientes", headers=headers, params={"page": 1, "page_size": 10}
    )
    assert pagina_1.status_code == 200
    body_1 = pagina_1.json()
    assert len(body_1["items"]) == 10
    assert body_1["total"] == 25
    assert body_1["page"] == 1
    assert body_1["page_size"] == 10
    assert body_1["pages"] == 3
    assert [p["nombre"] for p in body_1["items"]] == [f"Paciente {i:02d}" for i in range(10)]

    pagina_3 = client.get(
        "/api/v1/clinica/pacientes", headers=headers, params={"page": 3, "page_size": 10}
    )
    assert pagina_3.status_code == 200
    body_3 = pagina_3.json()
    assert len(body_3["items"]) == 5
    assert body_3["total"] == 25
    assert body_3["pages"] == 3


def test_pagination_defaults(client, db_session, consultorio):
    headers = _headers_psicologo(client, db_session, consultorio)
    _crear_paciente(client, headers, "Paciente Unico", "999")

    response = client.get("/api/v1/clinica/pacientes", headers=headers)
    assert response.status_code == 200
    body = response.json()
    assert body["page"] == 1
    assert body["page_size"] == 20
    assert body["total"] == 1
    assert body["pages"] == 1


def test_pagination_invalid_params_returns_422(client, db_session, consultorio):
    headers = _headers_psicologo(client, db_session, consultorio)

    for params in (
        {"page": 0},
        {"page": -1},
        {"page_size": 0},
        {"page_size": 101},
    ):
        response = client.get("/api/v1/clinica/pacientes", headers=headers, params=params)
        assert response.status_code == 422, params


def test_search_por_nombre(client, db_session, consultorio):
    headers = _headers_psicologo(client, db_session, consultorio)
    _crear_paciente(client, headers, "Maria Fernanda Gomez", "100")
    _crear_paciente(client, headers, "Juan Perez", "200")

    response = client.get(
        "/api/v1/clinica/pacientes", headers=headers, params={"search": "fernanda"}
    )
    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 1
    assert body["items"][0]["nombre"] == "Maria Fernanda Gomez"


def test_search_por_documento(client, db_session, consultorio):
    headers = _headers_psicologo(client, db_session, consultorio)
    _crear_paciente(client, headers, "Maria Fernanda Gomez", "1002003")
    _crear_paciente(client, headers, "Juan Perez", "9998887")

    response = client.get(
        "/api/v1/clinica/pacientes", headers=headers, params={"search": "2003"}
    )
    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 1
    assert body["items"][0]["documento_identidad"] == "1002003"


def test_search_combinada_con_paginacion_afecta_total(client, db_session, consultorio):
    headers = _headers_psicologo(client, db_session, consultorio)
    for i in range(5):
        _crear_paciente(client, headers, f"Ansiedad Caso {i}", f"A-{i}")
    for i in range(3):
        _crear_paciente(client, headers, f"Otro Paciente {i}", f"B-{i}")

    response = client.get(
        "/api/v1/clinica/pacientes",
        headers=headers,
        params={"search": "Ansiedad", "page": 1, "page_size": 2},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 5
    assert body["pages"] == 3
    assert len(body["items"]) == 2


def test_pagina_fuera_de_rango_devuelve_items_vacios_200(client, db_session, consultorio):
    headers = _headers_psicologo(client, db_session, consultorio)
    _crear_paciente(client, headers, "Paciente Unico", "555")

    response = client.get(
        "/api/v1/clinica/pacientes", headers=headers, params={"page": 999, "page_size": 20}
    )
    assert response.status_code == 200
    body = response.json()
    assert body["items"] == []
    assert body["total"] == 1
    assert body["pages"] == 1


def test_pagination_respeta_multitenancy(client, db_session, consultorio):
    headers_a = _headers_psicologo(client, db_session, consultorio, email="pag-a@example.com")
    headers_b = _headers_psicologo(client, db_session, consultorio, email="pag-b@example.com")

    for i in range(3):
        _crear_paciente(client, headers_a, f"Paciente A{i}", f"A-{i}")
    for i in range(7):
        _crear_paciente(client, headers_b, f"Paciente B{i}", f"B-{i}")

    respuesta_a = client.get("/api/v1/clinica/pacientes", headers=headers_a)
    assert respuesta_a.json()["total"] == 3

    respuesta_b = client.get("/api/v1/clinica/pacientes", headers=headers_b)
    assert respuesta_b.json()["total"] == 7
