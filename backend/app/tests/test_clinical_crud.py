from datetime import date

from app.tests.utils import auth_headers, crear_psicologo_autorizado


def _headers_psicologo(client, db_session, consultorio, email="clinico@example.com"):
    token = crear_psicologo_autorizado(
        client, db_session, consultorio_id=consultorio.id, email=email
    )
    return auth_headers(token, consultorio.id)


def test_paciente_crud_and_edad(client, db_session, consultorio):
    headers = _headers_psicologo(client, db_session, consultorio)

    creado = client.post(
        "/api/v1/clinica/pacientes",
        headers=headers,
        json={
            "nombre": "Ana Paciente",
            "documento_identidad": "123456",
            "fecha_nacimiento": "2000-01-01",
        },
    )
    assert creado.status_code == 201
    body = creado.json()
    hoy = date.today()
    edad_esperada = hoy.year - 2000 - (1 if (hoy.month, hoy.day) < (1, 1) else 0)
    assert body["edad"] == edad_esperada
    paciente_id = body["id"]

    duplicado = client.post(
        "/api/v1/clinica/pacientes",
        headers=headers,
        json={"nombre": "Otra", "documento_identidad": "123456"},
    )
    assert duplicado.status_code == 409

    obtenido = client.get(f"/api/v1/clinica/pacientes/{paciente_id}", headers=headers)
    assert obtenido.status_code == 200

    actualizado = client.put(
        f"/api/v1/clinica/pacientes/{paciente_id}",
        headers=headers,
        json={"telefono_celular": "3000000000"},
    )
    assert actualizado.status_code == 200
    assert actualizado.json()["telefono_celular"] == "3000000000"

    eliminado = client.delete(f"/api/v1/clinica/pacientes/{paciente_id}", headers=headers)
    assert eliminado.status_code == 204

    listado = client.get("/api/v1/clinica/pacientes", headers=headers)
    assert listado.status_code == 200
    assert listado.json()["items"] == []
    assert listado.json()["total"] == 0

    obtenido_tras_borrar = client.get(f"/api/v1/clinica/pacientes/{paciente_id}", headers=headers)
    assert obtenido_tras_borrar.status_code == 404


def test_proceso_sesion_compromiso_flow_and_numero_sesion_unico(client, db_session, consultorio):
    headers = _headers_psicologo(client, db_session, consultorio)

    paciente = client.post(
        "/api/v1/clinica/pacientes",
        headers=headers,
        json={"nombre": "Paciente Flujo", "documento_identidad": "999"},
    ).json()

    proceso = client.post(
        f"/api/v1/clinica/pacientes/{paciente['id']}/procesos",
        headers=headers,
        json={"fecha_vinculacion": "2024-01-01", "motivo_consulta": "Ansiedad"},
    )
    assert proceso.status_code == 201
    proceso_id = proceso.json()["id"]

    proceso_actualizado = client.put(
        f"/api/v1/clinica/procesos/{proceso_id}",
        headers=headers,
        json={"estado": "CERRADO", "cierre_proceso": "Alta terapeutica"},
    )
    assert proceso_actualizado.status_code == 200
    assert proceso_actualizado.json()["estado"] == "CERRADO"

    sesion = client.post(
        f"/api/v1/clinica/procesos/{proceso_id}/sesiones",
        headers=headers,
        json={"fecha_sesion": "2024-01-10", "numero_sesion": 1, "notas_sesion": "Primera sesion"},
    )
    assert sesion.status_code == 201
    sesion_id = sesion.json()["id"]

    duplicada = client.post(
        f"/api/v1/clinica/procesos/{proceso_id}/sesiones",
        headers=headers,
        json={"fecha_sesion": "2024-01-17", "numero_sesion": 1},
    )
    assert duplicada.status_code == 409

    compromiso = client.post(
        f"/api/v1/clinica/sesiones/{sesion_id}/compromisos",
        headers=headers,
        json={"descripcion": "Practicar respiracion"},
    )
    assert compromiso.status_code == 201
    compromiso_id = compromiso.json()["id"]

    compromiso_actualizado = client.put(
        f"/api/v1/clinica/compromisos/{compromiso_id}",
        headers=headers,
        json={"estado": "CUMPLIDO", "resultado_seguimiento": "Lo logro"},
    )
    assert compromiso_actualizado.status_code == 200
    assert compromiso_actualizado.json()["estado"] == "CUMPLIDO"

    historia = client.get(f"/api/v1/clinica/pacientes/{paciente['id']}/historia", headers=headers)
    assert historia.status_code == 200
    historia_body = historia.json()
    assert len(historia_body["procesos"]) == 1
    assert len(historia_body["procesos"][0]["sesiones"]) == 1
    assert len(historia_body["procesos"][0]["sesiones"][0]["compromisos"]) == 1
    assert historia_body["procesos"][0]["sesiones"][0]["compromisos"][0]["estado"] == "CUMPLIDO"

    resumen_proceso = client.get(f"/api/v1/clinica/procesos/{proceso_id}/resumen", headers=headers)
    assert resumen_proceso.status_code == 200
    assert len(resumen_proceso.json()["sesiones"]) == 1

    resumen_sesiones = client.get(
        f"/api/v1/clinica/pacientes/{paciente['id']}/resumen-sesiones", headers=headers
    )
    assert resumen_sesiones.status_code == 200
    assert len(resumen_sesiones.json()) == 1

    eliminar_compromiso = client.delete(
        f"/api/v1/clinica/compromisos/{compromiso_id}", headers=headers
    )
    assert eliminar_compromiso.status_code == 204

    eliminar_sesion = client.delete(f"/api/v1/clinica/sesiones/{sesion_id}", headers=headers)
    assert eliminar_sesion.status_code == 204

    eliminar_proceso = client.delete(f"/api/v1/clinica/procesos/{proceso_id}", headers=headers)
    assert eliminar_proceso.status_code == 204


def test_envio_historia_se_registra(client, db_session, consultorio):
    headers = _headers_psicologo(client, db_session, consultorio)

    paciente = client.post(
        "/api/v1/clinica/pacientes",
        headers=headers,
        json={"nombre": "Paciente Envio", "documento_identidad": "555"},
    ).json()

    envio = client.post(
        f"/api/v1/clinica/pacientes/{paciente['id']}/envios",
        headers=headers,
        json={"tipo_documento": "HISTORIA_COMPLETA", "email_destino": "destino@example.com"},
    )
    assert envio.status_code == 201
    body = envio.json()
    assert body["estado"] == "ENVIADO"
    assert body["email_destino"] == "destino@example.com"
    assert body["tipo_documento"] == "HISTORIA_COMPLETA"


def test_mismo_documento_permitido_para_psicologos_distintos(client, db_session, consultorio):
    headers_a = _headers_psicologo(client, db_session, consultorio, email="psi-doc-a@example.com")
    headers_b = _headers_psicologo(client, db_session, consultorio, email="psi-doc-b@example.com")

    creado_a = client.post(
        "/api/v1/clinica/pacientes",
        headers=headers_a,
        json={"nombre": "Paciente Compartido A", "documento_identidad": "777"},
    )
    assert creado_a.status_code == 201

    creado_b = client.post(
        "/api/v1/clinica/pacientes",
        headers=headers_b,
        json={"nombre": "Paciente Compartido B", "documento_identidad": "777"},
    )
    assert creado_b.status_code == 201
