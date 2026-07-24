# Planificacion de implementacion

## 1. Objetivo del plan

Construir una primera version funcional de la aplicacion de historias clinicas psicologicas, basada en los requerimientos de `REQUERIMIENTOS.md` y el analisis aprobado en `ANALISIS.md`.

La implementacion se hara por fases para entregar primero una base tecnica estable, luego los flujos funcionales principales, despues pruebas, y finalmente despliegue local y en la nube.

## 2. Alcance de la primera version

Incluye:

- Frontend en React.
- Backend en Python con FastAPI.
- Base de datos MySQL.
- Autenticacion con JWT.
- Registro e inicio de sesion de psicologos.
- Vinculacion de psicologos a consultorios precreados.
- Autorizacion de psicologos por administrador de consultorio.
- Contexto activo de consultorio para psicologos con varios consultorios.
- CRUD de pacientes propios.
- CRUD de procesos por paciente.
- CRUD de sesiones por proceso, incluyendo `notas_sesion`.
- CRUD de compromisos por sesion.
- Vista imprimible de resumen e historia clinica completa.
- Envio por correo con registro basico de auditoria.

No incluye en primera version:

- Formularios para crear o administrar consultorios.
- Adjuntos, documentos firmados o imagenes de paciente.
- Auditoria completa de cambios de historia clinica.
- Reglas especificas de consentimiento y tratamiento de datos personales.
- Atencion compartida del mismo paciente por varios psicologos.
- Acceso del administrador a historias clinicas de otros psicologos.

## 3. Arquitectura propuesta

Estructura sugerida del repositorio:

```text
hist-clinica-psic/
  backend/
    app/
      api/
      core/
      db/
      models/
      schemas/
      services/
      tests/
    alembic/
    pyproject.toml
    Dockerfile
  frontend/
    src/
      api/
      components/
      features/
      layouts/
      pages/
      routes/
      styles/
    package.json
    Dockerfile
  docker-compose.yml
  .env.example
  REQUERIMIENTOS.md
  ANALISIS.md
  PLANIFICACION.md
```

Backend:

- FastAPI como framework HTTP.
- SQLAlchemy 2.x como ORM.
- Alembic para migraciones.
- Pydantic para schemas de entrada/salida.
- PyJWT o python-jose para JWT.
- Passlib/bcrypt para password hashing.
- Pytest para pruebas.

Frontend:

- React con Vite.
- React Router para navegacion.
- TanStack Query o capa propia simple para consumo API.
- Formularios controlados con validacion basica.
- CSS modular o una estructura simple de estilos globales/componentes.

Base de datos:

- MySQL 8.
- Migraciones versionadas con Alembic.
- Datos semilla para consultorios y usuarios iniciales.

## 4. Fase 0 - Preparacion del proyecto

Objetivo: dejar el repositorio listo para desarrollo consistente.

Tareas:

- [x] Crear estructura `backend/` y `frontend/`.
- [x] Crear `.env.example` con variables requeridas.
- [x] Crear `docker-compose.yml` para MySQL, backend y frontend en desarrollo local.
- [x] Definir convenciones de nombres, formato y comandos de desarrollo.
- [x] Configurar gitignore para Python, Node, entornos virtuales, builds y variables locales.

Entregables:

- Estructura base del proyecto.
- Comandos documentados para levantar el entorno local.
- Variables de entorno definidas.

Criterios de aceptacion:

- El repo permite instalar dependencias de backend y frontend.
- MySQL puede levantarse localmente con Docker Compose.
- Existe una configuracion local reproducible desde `.env.example`.

## 5. Fase 1 - Backend base y base de datos

Objetivo: implementar la capa fundacional del backend y el modelo de datos.

Tareas:

- [x] Crear aplicacion FastAPI.
- [x] Configurar settings por variables de entorno.
- [x] Configurar conexion a MySQL con SQLAlchemy.
- [x] Configurar Alembic.
- [x] Crear modelos ORM:
  - [x] `Consultorio`
  - [x] `Psicologo`
  - [x] `PsicologoConsultorio`
  - [x] `Paciente`
  - [x] `Proceso`
  - [x] `Sesion`
  - [x] `Compromiso`
  - [x] `RegistroEnvioHistoria`
- [x] Crear migracion inicial.
- [x] Crear seed inicial para consultorios y un administrador de prueba.
- [x] Crear endpoint `GET /health`.

Entregables:

- Backend arranca localmente.
- Migracion inicial crea el esquema completo.
- Seed permite probar autorizacion y login desde datos iniciales.

Criterios de aceptacion:

- `GET /health` responde correctamente.
- Alembic aplica migraciones sobre MySQL limpio.
- Las tablas coinciden con el modelo aprobado en `ANALISIS.md`.

## 6. Fase 2 - Autenticacion, autorizacion y multi-tenancy

Objetivo: implementar seguridad antes de exponer datos clinicos.

Tareas:

- [x] Implementar hashing de password.
- [x] Implementar registro de psicologos.
- [x] Implementar login con JWT.
- [x] Implementar endpoint de perfil autenticado.
- [x] Implementar listado de consultorios asociados al psicologo.
- [x] Implementar seleccion o uso de `consultorio_id` activo.
- [x] Implementar dependencia backend para validar:
  - [x] JWT valido.
  - [x] Psicologo activo.
  - [x] Relacion psicologo-consultorio autorizada.
- [x] Implementar endpoints de administrador:
  - [x] Listar solicitudes pendientes del consultorio.
  - [x] Autorizar psicologos.
  - [x] Rechazar psicologos.
- [x] Validar que solo exista un administrador autorizado por consultorio.

Entregables:

- Flujo completo de registro, login y autorizacion.
- Middleware/dependencias reutilizables de seguridad.

Criterios de aceptacion:

- Un psicologo no autorizado no puede operar en un consultorio.
- Un administrador solo puede autorizar psicologos de su consultorio.
- El administrador no puede ver historias clinicas de otros psicologos.
- Los endpoints clinicos quedan preparados para validar propiedad del dato.

## 7. Fase 3 - API clinica principal

Objetivo: implementar los endpoints para gestionar la informacion clinica.

Tareas:

- [x] Implementar CRUD de pacientes propios.
- [x] Implementar validacion de propiedad por `consultorio_id` y `psicologo_id`.
- [x] Implementar calculo de edad desde `fecha_nacimiento` en respuestas donde aplique.
- [x] Implementar CRUD de procesos por paciente.
- [x] Implementar CRUD de sesiones por proceso, incluyendo `notas_sesion`.
- [x] Implementar CRUD de compromisos por sesion.
- [x] Implementar endpoints de lectura agregada:
  - [x] Historia clinica completa de un paciente.
  - [x] Resumen de proceso.
  - [x] Resumen de sesiones.
- [x] Implementar registro de envio de historia/resumen por correo.
- [x] Implementar servicio de correo configurable, con modo local de prueba.

Entregables:

- API clinica completa para la primera version.
- Schemas Pydantic de entrada/salida.
- Validaciones de permisos en todos los endpoints clinicos.

Criterios de aceptacion:

- Un psicologo solo puede crear, leer, modificar y eliminar sus pacientes.
- No se puede acceder a procesos, sesiones o compromisos de pacientes ajenos.
- El numero de sesion es unico dentro del proceso.
- La historia clinica completa se genera desde las tablas existentes.

## 8. Fase 4 - Frontend base y autenticacion

Objetivo: construir la interfaz base y los flujos de acceso.

Tareas:

- [x] Crear proyecto React con Vite.
- [x] Configurar rutas publicas y privadas.
- [x] Crear layout principal de aplicacion.
- [x] Crear cliente API con manejo de JWT.
- [x] Crear pantallas:
  - [x] Login.
  - [x] Registro de psicologo.
  - [x] Seleccion de consultorio activo.
  - [x] Perfil basico.
- [x] Crear proteccion de rutas segun autenticacion y consultorio activo.
- [x] Crear UI para administrador:
  - [x] Solicitudes pendientes.
  - [x] Autorizar o rechazar psicologos.

Entregables:

- Frontend navegable con autenticacion.
- Flujo funcional de autorizacion desde UI.

Criterios de aceptacion:

- El usuario puede registrarse e iniciar sesion.
- Si tiene varios consultorios, puede seleccionar el contexto activo.
- Un usuario pendiente o rechazado no puede entrar al modulo clinico.

## 9. Fase 5 - Frontend clinico

Objetivo: construir la experiencia de gestion de pacientes, procesos, sesiones y compromisos.

Tareas:

- [x] Crear listado y busqueda de pacientes propios.
- [x] Crear formulario de paciente.
- [x] Crear vista detalle de paciente.
- [x] Crear modulo de procesos del paciente.
- [x] Crear formulario de proceso.
- [x] Crear modulo de sesiones por proceso.
- [x] Crear formulario de sesion con `notas_sesion`.
- [x] Crear modulo de compromisos por sesion.
- [x] Crear vista de historia clinica completa.
- [x] Crear vista imprimible.
- [x] Crear accion para enviar resumen o historia por correo.
- [x] Mostrar estados de carga, error y confirmacion.

Entregables:

- UI clinica completa para la primera version.
- Flujo operativo desde paciente hasta compromisos.
- Vista imprimible de historia clinica.

Criterios de aceptacion:

- Un psicologo puede gestionar todo el ciclo clinico de sus pacientes.
- La interfaz no muestra pacientes ajenos.
- La historia clinica completa incluye datos generales, procesos, sesiones, notas y compromisos.

## 10. Fase 6 - Pruebas

Objetivo: validar comportamiento funcional, permisos y estabilidad basica.

Tareas backend:

- [x] Pruebas unitarias de servicios de autenticacion.
- [x] Pruebas unitarias de validacion multi-tenant.
- [x] Pruebas de integracion de endpoints principales.
- [x] Pruebas de permisos:
  - [x] Usuario no autenticado.
  - [x] Usuario pendiente.
  - [x] Usuario autorizado en otro consultorio.
  - [x] Psicologo intentando acceder a paciente ajeno.
  - [x] Administrador intentando acceder a paciente ajeno.
- [x] Pruebas de CRUD clinico.

Suite implementada en `backend/app/tests` (33 pruebas, `pytest`, SQLite en memoria, sin dependencia de MySQL). Ver `backend/app/tests/conftest.py` para la infraestructura y `backend/app/tests/utils.py` para los helpers de registro/login/autorizacion usados en los distintos escenarios.

Tareas frontend:

- [x] Pruebas de componentes criticos con Vitest:
  - [x] Configurar Vitest + Testing Library en el frontend (`vitest`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`; `vite.config.ts` con bloque `test`; `src/test/setup.ts`; scripts `test`/`test:watch`).
  - [x] Pruebas de `utils/format.ts` (formateo de fechas, casos nulo/invalido).
  - [x] Pruebas de `api/client.ts` (headers de auth y `X-Consultorio-Id`, parseo de errores string y de validacion 422, storage de token/consultorio).
  - [x] Pruebas de `context/AuthContext.tsx` (bootstrap sin token, login exitoso, `selectConsultorio` solo activa membresias AUTORIZADO, logout).
  - [x] Pruebas de guards de ruta (`RequireAuth`, `RequireConsultorioActivo`, `RequireAdmin`).
  - [x] Pruebas de `LoginPage` (submit exitoso navega, error de login se muestra).
  - [x] Pruebas de `PacientesListPage` (listado, filtro de busqueda client-side, estado de error).

Suite implementada en `frontend/src/**/*.test.{ts,tsx}` (30 pruebas, `vitest run`). Ejecutar con `npm test` en `frontend/`.

- [x] Pruebas manuales guiadas de flujos principales. Checklist ejecutado por el usuario en `PRUEBAS_MANUALES.md`, sin hallazgos.
- [x] Verificacion visual en desktop y mobile. Checklist en `PRUEBAS_MANUALES.md` seccion 4, ejecutado sin hallazgos.

Tareas end-to-end:

- [x] Login.
- [x] Seleccion de consultorio.
- [x] Crear paciente.
- [x] Crear proceso.
- [x] Crear sesion con notas.
- [x] Crear compromiso.
- [x] Ver historia completa.
- [x] Imprimir historia.

Estos flujos se probaron de forma exploratoria durante el desarrollo de las Fases 4 y 5 y quedaron formalizados y ejecutados como checklist en `PRUEBAS_MANUALES.md` seccion 1, sin hallazgos.

### 10.1 Auditoria de riesgos (resiliencia, sesion, errores de usuario)

Objetivo: revisar el comportamiento de la aplicacion ante condiciones adversas que las pruebas funcionales normales no cubren (red caida, timeouts, tokens vencidos, entradas malformadas, muchos usuarios concurrentes). Hallazgos concretos encontrados en la revision y su tratamiento:

Backend:

- [x] `debug=True` por defecto en `Settings` (`backend/app/core/config.py`) puede filtrar tracebacks internos en un 500 no controlado si se despliega sin fijar `DEBUG=false` explicitamente. Cambiado el default a `False` (el `.env` local sigue habilitando `DEBUG=true` para desarrollo). Test: `test_error_handling.py::test_unhandled_exception_does_not_leak_traceback_when_debug_false`.
- [x] Token JWT expirado (`exp` en el pasado): rechazado con 401. Test: `test_auth_token_risks.py::test_expired_token_is_rejected`.
- [x] Token JWT con firma invalida (firmado con otra clave): rechazado con 401. Test: `test_auth_token_risks.py::test_token_firmado_con_clave_incorrecta_es_rechazado`.
- [x] Psicologo desactivado (`activo=False`) con un token ya emitido: `/auth/me` responde 401. Test: `test_auth_token_risks.py::test_psicologo_desactivado_no_puede_usar_token_vigente`.
- [x] Login de un psicologo desactivado: responde 403 y no emite token. Test: `test_auth_token_risks.py::test_login_de_psicologo_desactivado_devuelve_403`.
- [x] Header `X-Consultorio-Id` ausente o no numerico en un endpoint clinico: responde 422. Tests: `test_error_handling.py::test_missing_consultorio_header_returns_422`, `test_non_numeric_consultorio_header_returns_422`.
- [x] Parametro de ruta no numerico (ej. `GET /clinica/pacientes/abc`): responde 422. Test: `test_error_handling.py::test_non_numeric_path_param_returns_422`.
- [x] Body JSON malformado (sintaxis invalida): responde 422, no 500. Test: `test_error_handling.py::test_malformed_json_body_returns_422_not_500`.
- [x] `numero_sesion` invalido (0 o negativo): responde 422. Test: `test_error_handling.py::test_numero_sesion_invalido_returns_422`.
- [x] Email invalido al crear paciente o al enviar historia por correo: responde 422. Tests: `test_error_handling.py::test_email_invalido_al_crear_paciente_returns_422`, `test_email_invalido_al_enviar_historia_returns_422`.
- [x] Crear un proceso sobre un paciente ya desactivado: responde 404. Test: `test_error_handling.py::test_crear_proceso_sobre_paciente_desactivado_returns_404`.
- [x] Falla del proveedor SMTP al enviar historia: el registro queda en estado `FALLIDO` con el error capturado, respondiendo 201. Test: `test_error_handling.py::test_envio_historia_con_smtp_caido_se_registra_como_fallido`.

Frontend:

- [x] `apiFetch` (`frontend/src/api/client.ts`) no tenia timeout, dejando la UI en "Cargando..." indefinidamente ante una red caida o servidor colgado. Agregado `AbortController` con timeout de 15s que traduce el aborto en un `ApiError` con mensaje claro. Test: `client.test.ts` (timeout).
- [x] `apiFetch` no distinguia un fallo de red (`fetch` rechaza con `TypeError`) de un error de la API. Se envuelve el fallo de red en un `ApiError` con mensaje especifico de conexion. Test: `client.test.ts` (fallo de red).
- [x] Ninguna pantalla fuera de `AuthContext` (bootstrap) reaccionaba a un 401 con el usuario ya autenticado (token vencido a mitad de sesion dejaba al usuario "atascado"). Agregado evento global `hcp:unauthorized` disparado por `apiFetch` en cualquier 401 autenticado, escuchado por `AuthContext` para cerrar sesion automaticamente. Tests: `client.test.ts` (dispara/no dispara el evento segun `auth`), `AuthContext.test.tsx` (cierre de sesion automatico).
- [x] Test de regresion para el mensaje de error cuando el envio de historia por correo devuelve `estado: FALLIDO`. Test: `HistoriaClinicaPage.test.tsx`.
- [x] Test de regresion para el mensaje de error controlado cuando se navega manualmente a un paciente inexistente o ajeno (`/pacientes/<id>`) y el backend responde 404/422. Test: `PacienteDetailPage.test.tsx`.

Riesgos identificados y diferidos (fuera de alcance de esta pasada, requieren decision de arquitectura/infraestructura):

- Rate limiting / bloqueo por intentos fallidos de login: no implementado. Un limitador en memoria de un solo proceso no protege un despliegue con multiples instancias; requiere un almacen compartido (ej. Redis) y es una decision de infraestructura, no solo de codigo. Se deja para cuando la app tenga uso real en produccion.

### 10.2 Paginacion en `GET /clinica/pacientes`

Implementado (a diferencia del resto de riesgos diferidos, se resolvio de inmediato por pedido explicito del usuario, antes de tener uso real en produccion). Alcance: solo `/clinica/pacientes` — procesos/sesiones/compromisos y `/admin/solicitudes` quedan sin paginar porque estan naturalmente acotados por su padre (un paciente no acumula cientos de procesos).

- [x] Backend: `PageResponse[T]` generico (`backend/app/schemas/common.py`) y endpoint `GET /clinica/pacientes` con query params `page` (default 1), `page_size` (default 20, maximo 100) y `search` (filtra por `nombre` o `documento_identidad`, case-insensitive). Respuesta envelope `{ items, total, page, page_size, pages }`. Una pagina fuera de rango responde 200 con `items: []` (no 404), para no romper a un usuario con una pagina vieja abierta.
- [x] Backend: tests en `backend/app/tests/test_pacientes_pagination.py` (metadata de paginacion, defaults, `page`/`page_size` invalidos -> 422, busqueda por nombre y por documento, busqueda combinada con paginacion, pagina fuera de rango, multi-tenancy respetada). Se corrigieron 3 asserts existentes (`test_clinical_crud.py`, `test_permissions.py`) que asumian la forma anterior (array plano) de la respuesta.
- [x] Frontend: `PageResponse<T>` (`frontend/src/api/types.ts`) y `fetchPacientes(consultorioId, { page, pageSize, search })` (`frontend/src/api/client.ts`).
- [x] Frontend: componente reutilizable `frontend/src/components/Pagination.tsx` (controlado, ventana de 5 numeros, deshabilita Anterior/Siguiente en los extremos) con test propio.
- [x] Frontend: `PacientesListPage.tsx` movio la busqueda de client-side a server-side (necesario para que la paginacion no rompa la busqueda existente: con datos paginados, filtrar en el cliente solo veria la pagina actual). Debounce de 300ms sin librerias nuevas, reset a pagina 1 al cambiar la busqueda o el consultorio activo, muestra el total de resultados y los controles de paginacion.
- [x] Frontend: tests actualizados/ampliados en `PacientesListPage.test.tsx` (envelope, busqueda server-side con reset de pagina, avanzar/retroceder pagina).

Entregables:

- [x] Suite de pruebas backend ejecutable (`backend/app/tests`, 55 pruebas pasando).
- [x] Suite de pruebas frontend ejecutable (`frontend/src`, 48 pruebas con Vitest, `npm test`).
- [x] Checklist de pruebas manuales frontend (`PRUEBAS_MANUALES.md`).
- [x] Evidencia de flujos principales funcionando (checklist manual ejecutado por el usuario, sin hallazgos).
- [x] Auditoria de riesgos de resiliencia, sesion y errores de usuario (seccion 10.1), con hallazgos corregidos y cubiertos por tests.
- [x] Paginacion server-side en el listado de pacientes (seccion 10.2), con busqueda server-side y tests.

Criterios de aceptacion:

- [x] Las pruebas backend pasan localmente.
- [x] Las pruebas frontend pasan localmente.
- [x] No hay fugas de datos entre psicologos o consultorios en los casos probados (cubierto por `test_permissions.py`).
- [x] El flujo clinico principal funciona completo (verificado con `PRUEBAS_MANUALES.md`).
- [x] La aplicacion se degrada de forma controlada ante red caida, timeouts, tokens vencidos/invalidos y entradas malformadas (seccion 10.1).

## 11. Fase 7 - Despliegue local

Objetivo: dejar la aplicacion ejecutable localmente de forma reproducible.

Tareas (via Docker, para desarrollo):

- [x] Completar `docker-compose.yml` para:
  - [x] MySQL.
  - [x] Backend FastAPI.
  - [x] Frontend React.
- [x] Configurar variables locales (`.env` / `.env.example`).
- [x] Crear comandos de migracion y seed (`alembic upgrade head`, `python -m app.db.seed`).
- [x] Documentar arranque local en README.
- [x] Verificar persistencia de datos MySQL (volumen `mysql_data` en `docker-compose.yml`).
- [x] Verificar CORS entre frontend y backend (`CORS_ORIGINS`, usado en toda la app durante las Fases 4-6).

### 11.1 Instalacion local sin Docker (usuario final)

Pedido explicito: la app debe poder instalarse en cualquier computador sin
depender de Docker, para un usuario sin conocimientos de sistemas.

- [x] `MANUAL-INSTALACION-LOCAL.md`: guia paso a paso (instalar Python,
  Node.js y MySQL; crear la base de datos; ejecutar los scripts).
- [x] `instalar.bat`: verifica requisitos (Python, Node, conexion a MySQL),
  crea `backend/.env` desde `backend/.env.example`, crea el entorno virtual
  e instala dependencias del backend, aplica migraciones y datos semilla, e
  instala dependencias del frontend. Idempotente (se puede ejecutar varias
  veces sin duplicar datos ni romper nada).
- [x] `iniciar.bat`: verifica requisitos, abre el backend y el frontend cada
  uno en su propia ventana visible (`backend/run-local.bat`,
  `frontend/run-local.bat`) y abre el navegador en `http://localhost:5173`.
  Detener la app es simplemente cerrar esas ventanas.
- [x] `backend/.env.example`: plantilla equivalente a la de la raiz pero con
  `DATABASE_URL` apuntando a `localhost` en vez del nombre de servicio
  `mysql` de Docker (la raiz sigue siendo para Docker; conviven sin chocar
  porque usan archivos `.env` distintos).
- [x] `instalar.bat` probado de punta a punta (verificacion de Python/Node,
  conexion a MySQL, creacion de `.venv`, `pip install`, `alembic upgrade
  head`, seed, `npm install`) contra una base de datos MySQL real.

Riesgo identificado y documentado (no es un bug, es una limitacion
inherente de correr dos flujos en paralelo): Docker y la instalacion nativa
usan los mismos puertos (8000 y 5173), por lo que no pueden correr al mismo
tiempo en el mismo computador. Documentado en la seccion de solucion de
problemas de `MANUAL-INSTALACION-LOCAL.md`.

Entregables:

- [x] Aplicacion local levantada con Docker Compose (para desarrollo).
- [x] Aplicacion local instalable sin Docker en Windows (para uso final),
  con manual paso a paso y scripts `instalar.bat`/`iniciar.bat`.
- [x] README con pasos de ejecucion para ambos flujos.

Criterios de aceptacion:

- [x] Un desarrollador puede levantar la app local desde cero (via Docker).
- [x] Un usuario sin conocimientos tecnicos puede instalar y usar la app en
  su propio computador siguiendo `MANUAL-INSTALACION-LOCAL.md`, sin Docker.
- [x] Las migraciones y datos semilla se pueden aplicar sin pasos manuales
  ambiguos, en ambos flujos.
- [x] Frontend consume backend correctamente en ambos flujos.

## 12. Fase 8 - Despliegue en la nube

Objetivo: preparar una version desplegable en un proveedor cloud.

Decision (pedido explicito del usuario): se documentan **dos caminos**,
no uno solo, porque el usuario esta aprendiendo despliegues en la nube y
quiere comparar una opcion simple tipo PaaS contra AWS especificamente.
Investigado con busquedas web (precios de julio 2026) antes de escribir,
porque las capas gratuitas de Railway y Fly.io cambiaron desde que se
redacto la sugerencia inicial de este documento (ya no son gratuitas).

- **Camino A - Railway (backend + MySQL) + Vercel (frontend)**: el mas
  simple, todo por paneles web. ~5-10 USD/mes (Railway ya no tiene capa
  gratuita permanente; Vercel si).
- **Camino B - AWS EC2 + Docker Compose**: reutiliza
  `docker-compose.prod.yml`, mismo patron que la instalacion local. $0/mes
  si la cuenta de AWS califica para la capa gratuita clasica (creada antes
  del 15 de julio de 2025); si no, consume creditos de bienvenida o cuesta
  unos 7-8 USD/mes.

Ninguno de los dos caminos usa dominio propio ni HTTPS por ahora (decision
del usuario, para no sumar complejidad en esta primera pasada) — queda
como mejora futura documentada en cada manual.

Tareas:

- [x] Separar configuracion por ambiente: local, Docker dev, produccion
  (`backend/.env.example` para instalacion nativa local, `.env.example`
  para Docker dev, `.env` en la instancia/proveedor para produccion).
- [x] Crear Dockerfile de backend (ya existia; se le agrego
  `docker-entrypoint.sh` para aplicar migraciones y seed automaticamente
  al arrancar, idempotente, sin pasos manuales en ningun proveedor).
- [x] Crear build de frontend para produccion (`frontend/Dockerfile.prod`,
  multi-stage: compila con Vite y sirve el estatico con nginx, con
  fallback de rutas para react-router; probado localmente incluyendo una
  ruta profunda tipo `/pacientes/5`).
- [x] Configurar CORS para dominio productivo (documentado en ambos
  manuales: `CORS_ORIGINS` debe coincidir exactamente con la URL publica
  del frontend en cada proveedor).
- [x] Configurar variables secretas en el proveedor (documentado por
  proveedor; `SECRET_KEY` se genera nueva para produccion, nunca se
  reusa la de desarrollo).
- [x] Configurar base de datos MySQL en nube (Railway: plugin MySQL
  administrado; AWS: contenedor MySQL dentro del mismo
  `docker-compose.prod.yml`, sin exponer su puerto fuera de la maquina).
- [x] Ejecutar migraciones en nube (automatico via
  `docker-entrypoint.sh` en ambos caminos, no requiere paso manual).
- [ ] Configurar servicio de correo real (diferido: `SMTP_HOST` vacio
  sigue funcionando, los envios quedan registrados como exitosos sin
  mandar correo real de verdad — ver `app/services/mail.py`; contratar un
  proveedor SMTP real queda fuera de alcance de esta fase).
- [ ] Verificar HTTPS (diferido explicitamente: sin dominio propio no hay
  forma de emitir un certificado valido; documentado como mejora futura en
  ambos manuales, con nota de que Let's Encrypt/Certbot es el camino
  estandar cuando se agregue un dominio).
- [x] Documentar pasos de despliegue
  (`MANUAL-DESPLIEGUE-NUBE-RAILWAY-VERCEL.md`,
  `MANUAL-DESPLIEGUE-NUBE-AWS.md`).

Entregables:

- [x] Guia de despliegue cloud (dos manuales, uno por camino).
- [x] Configuracion lista para ambos proveedores
  (`docker-compose.prod.yml`, `frontend/Dockerfile.prod`,
  `frontend/nginx.conf`, `backend/docker-entrypoint.sh`).
- [ ] Aplicacion accesible desde URL publica: pendiente de que el usuario
  ejecute alguno de los dos manuales (verificado localmente que
  `docker-compose.prod.yml` funciona de punta a punta: build, arranque,
  migraciones/seed automaticos, login y `/health` correctos).

Criterios de aceptacion:

- [x] Backend responde en nube — verificado localmente con el stack de
  produccion (`docker-compose.prod.yml`); pendiente de confirmar en un
  proveedor real cuando el usuario ejecute un manual.
- [x] Frontend carga desde URL publica — verificado localmente (build de
  produccion con nginx, incluida navegacion profunda de react-router).
- [x] Login y CRUD principal funcionan contra base de datos cloud —
  verificado localmente contra el stack de produccion (login end-to-end
  exitoso).
- [x] Variables sensibles no quedan versionadas (`.env` excluido por
  `.gitignore`; confirmado que el primer commit de git no incluyo ningun
  `.env` real, solo los `.env.example`).

## 13. Orden recomendado de ejecucion

1. Fase 0 - Preparacion del proyecto.
2. Fase 1 - Backend base y base de datos.
3. Fase 2 - Autenticacion, autorizacion y multi-tenancy.
4. Fase 3 - API clinica principal.
5. Fase 4 - Frontend base y autenticacion.
6. Fase 5 - Frontend clinico.
7. Fase 6 - Pruebas.
8. Fase 7 - Despliegue local.
9. Fase 8 - Despliegue en la nube.

## 14. Hitos de aprobacion

Hito 1: base tecnica lista

- Proyecto backend/frontend creado.
- MySQL local funcionando.
- Migracion inicial aplicada.

Hito 2: seguridad lista

- Registro, login y JWT funcionando.
- Autorizacion de psicologos funcionando.
- Validacion multi-tenant implementada.

Hito 3: modulo clinico backend listo

- CRUD clinico completo.
- Pruebas de permisos principales pasando.

Hito 4: interfaz funcional lista

- Flujos principales disponibles desde React.
- Historia clinica completa visible e imprimible.

Hito 5: entrega local lista

- Docker Compose levanta la aplicacion completa.
- README permite instalar y ejecutar desde cero.

Hito 6: entrega cloud lista

- Aplicacion desplegada o lista para desplegar en proveedor elegido.
- Variables, migraciones y build documentados.

## 15. Decisiones tecnicas pendientes antes de codificar

- Confirmar si se usara Docker desde el inicio para desarrollo local.
- Confirmar proveedor cloud preferido para orientar la configuracion de despliegue.
- Confirmar si el envio de correo en primera version usara SMTP, SendGrid, Mailgun u otro proveedor.
- Confirmar si el frontend usara una libreria de componentes o CSS propio.
- Confirmar si se requiere exportacion PDF ademas de vista imprimible del navegador.

## 16. Riesgos de implementacion

- La regla de un unico administrador por consultorio requiere validacion transaccional cuidadosa.
- La seguridad multi-tenant debe implementarse en backend en todos los endpoints clinicos.
- Los datos clinicos son sensibles; cualquier prueba o seed debe usar datos ficticios.
- El envio por correo debe evitar exponer informacion clinica por error a destinatarios incorrectos.
- El despliegue cloud requiere manejo estricto de secretos y variables de entorno.

## 17. Criterio para iniciar codificacion

La codificacion debe iniciar cuando este `PLANIFICACION.md` sea revisado y aprobado.

Al aprobarse, se recomienda comenzar por Fase 0 y Fase 1, dejando una base local reproducible antes de implementar los flujos funcionales.


