# Control de cambios: Registro minimo + edicion de perfil

Estado: IMPLEMENTADO. Backend: 64/64 pruebas pasando (`pytest`, incluye
`test_profile_update.py`, 9 casos nuevos). Frontend: 55/55 pruebas pasando
(`vitest run`, incluye `ProfilePage.test.tsx` nuevo y el caso de `refreshMe` en
`AuthContext.test.tsx`), `tsc --noEmit` sin errores. Verificado tambien en caliente
contra el backend corriendo en Docker: `POST /auth/register` con solo
`email`/`password`/`consultorio_id` crea el psicologo con `nombre`/`cedula` vacios,
tal como se diseño.

## Objetivo

Reducir el formulario de registro a solo `email`, `password` y `consultorio` (mas la
casilla "Solicito rol de administrador", que es una decision funcional del registro,
no un dato personal, y se mantiene sin cambios). Los demas datos del psicologo
(`cedula`, `nombre`, `especialidad`, `tarjeta profesional`, `telefono de contacto`)
se completan despues, editandolos en la seccion Perfil. La seccion Perfil tambien
permite cambiar la contrasena.

## Analisis: ¿cambiar la contrasena requiere actualizar sesion/token?

Se reviso `backend/app/api/deps.py::get_current_psicologo` y
`backend/app/core/security.py::create_access_token`: el JWT es **stateless** — solo
firma `sub` (id del psicologo) y `exp`. En cada request, `get_current_psicologo`
decodifica el token y busca al psicologo por id; **nunca vuelve a verificar la
contrasena**. Conclusion:

- La sesion donde se hace el cambio de contrasena **sigue funcionando tal cual**,
  sin necesidad de reemitir el token ni de volver a iniciar sesion. No hace falta
  ningun cambio en el frontend para "refrescar" la sesion actual.
- Un token emitido antes del cambio (ej. otro dispositivo, o uno filtrado/robado)
  **sigue siendo valido hasta que expire de forma natural** (hasta
  `ACCESS_TOKEN_EXPIRE_MINUTES` = 120 minutos), aun despues de cambiar la
  contrasena. Invalidar de inmediato esos otros tokens requeriria un mecanismo con
  estado (ej. columna `password_changed_at` embebida en el token y verificada en
  cada request) — es una mejora de seguridad valida, pero es infraestructura nueva,
  no un requisito funcional del cambio de contrasena. **Se deja fuera de alcance de
  este cambio** y se documenta como riesgo diferido (ver seccion correspondiente),
  con el mismo criterio ya usado para el rate limiting de login.

## Endpoints nuevos requeridos (backend)

Hoy `GET /auth/me` es de solo lectura y no existe ninguna forma de que un psicologo
actualice sus propios datos ni su contrasena. Se requieren dos endpoints nuevos:

- **`PUT /auth/me`** (nuevo) — actualiza el perfil del psicologo autenticado
  (`nombre`, `cedula`, `especialidad`, `tarjeta_profesional`, `telefono_contacto`).
  Reutiliza `get_current_psicologo` (ya existente) para identificar al usuario;
  no requiere `X-Consultorio-Id` porque el perfil no es un recurso por consultorio.
  Actualizacion parcial (`exclude_unset=True`), mismo patron que `PacienteUpdate`
  en `clinical.py`.
- **`PUT /auth/me/password`** (nuevo) — cambia la contrasena del psicologo
  autenticado. Requiere `current_password` (se verifica con `verify_password`,
  igual que en login) y `new_password` (mismas reglas que en el registro:
  `min_length=8, max_length=128`). Si `current_password` no coincide, responde 400
  (no 401 — el usuario ya esta autenticado con un token valido, el problema es un
  dato del formulario, no la sesion). Exigir la contrasena actual es una practica
  estandar de seguridad: evita que alguien con acceso momentaneo a una sesion ya
  abierta pueda expulsar al dueño real de la cuenta cambiandole la contrasena sin
  saberla. Responde `204 No Content` en exito (mismo patron que los `DELETE` de
  `clinical.py`, no hace falta devolver el perfil).

No se requieren mas endpoints nuevos. `POST /auth/register` se modifica (no se crea
uno nuevo) para aceptar menos campos.

## Cambios en backend

- `backend/app/schemas/auth.py`:
  - `PsicologoRegisterRequest`: se eliminan `nombre`, `especialidad`,
    `tarjeta_profesional`, `telefono_contacto`. Queda: `email`, `password`,
    `consultorio_id`, `solicita_admin`. **`cedula` tambien se elimina** (el pedido
    del usuario es "solamente email, password y consultorio").
  - Nuevo schema `PsicologoUpdateRequest`: `nombre`, `cedula`, `especialidad`,
    `tarjeta_profesional`, `telefono_contacto`, todos opcionales, con las mismas
    validaciones (`min_length`/`max_length`) que tenian en el registro.
  - Nuevo schema `PasswordChangeRequest`: `current_password: str`,
    `new_password: str = Field(min_length=8, max_length=128)`.
- `backend/app/api/routes/auth.py`:
  - `register()`: ya no lee `payload.nombre`/`payload.cedula`/etc.; crea el
    `Psicologo` con `cedula=""`, `nombre=""`, `especialidad=None`,
    `tarjeta_profesional=None`, `telefono_contacto=None`.
  - Nuevo `PUT /auth/me` (ver arriba).
  - Nuevo `PUT /auth/me/password` (ver arriba) — usa `verify_password` y
    `hash_password`, ya existentes en `app/core/security.py` (los mismos que usan
    `register`/`login`).
- Sin migracion de base de datos (decision ya tomada: `cedula`/`nombre` siguen
  `NOT NULL`, se usa `''` como valor vacio inicial).

## Cambios en frontend

- `frontend/src/api/types.ts`:
  - `PsicologoRegisterRequest`: se recorta a `email`, `password`, `consultorio_id`,
    `solicita_admin`.
  - Nuevo `PsicologoUpdateRequest`: `nombre?`, `cedula?`, `especialidad?`,
    `tarjeta_profesional?`, `telefono_contacto?`.
- `frontend/src/api/client.ts`:
  - `registerPsicologo`: firma actualizada al nuevo `PsicologoRegisterRequest`.
  - Nueva funcion `updateMe(payload: PsicologoUpdateRequest): Promise<PsicologoResponse>`
    -> `apiFetch('/auth/me', { method: 'PUT', body: payload, auth: true })`.
  - Nueva funcion `changeMyPassword(payload: PasswordChangeRequest): Promise<void>`
    -> `apiFetch('/auth/me/password', { method: 'PUT', body: payload, auth: true })`
    (`apiFetch` ya devuelve `undefined` en respuestas 204, no hace falta cambiar
    nada ahi).
- `frontend/src/pages/RegisterPage.tsx`: se quitan los campos `cedula`, `nombre`,
  `especialidad`, `tarjeta_profesional`, `telefono_contacto` del formulario y del
  estado. Queda: email, password, consultorio, checkbox de admin.
- `frontend/src/pages/ProfilePage.tsx`: pasa de vista de solo lectura (`<dl>`) a
  dos formularios editables independientes (mismo patron visual que
  `PacienteFormPage.tsx`, clase `entity-form`):
  1. **Datos del perfil**: `nombre`, `cedula`, `especialidad`, `tarjeta_profesional`,
     `telefono_contacto`. `email` se muestra de solo lectura (cambiar el email
     sigue fuera de alcance). Al guardar, llama a `updateMe(...)` y refresca los
     datos del usuario en el contexto de autenticacion.
  2. **Cambiar contrasena**: `current_password`, `new_password`,
     `confirm_new_password` (verificacion client-side de que coincidan antes de
     enviar, sin necesidad de nada en el backend). Al guardar, llama a
     `changeMyPassword(...)`; no requiere refrescar nada del contexto de
     autenticacion (ver analisis de sesion/token arriba) — solo limpiar el
     formulario y mostrar confirmacion. Se mantienen como dos formularios
     separados (no uno solo) porque tienen semantica y manejo de errores
     distintos: la contrasena puede fallar por "contrasena actual incorrecta"
     (400), algo que no aplica a los demas campos.
- `frontend/src/context/AuthContext.tsx`: se agrega un metodo `refreshMe()`
  (mismo patron que el `refreshConsultorios()` ya existente) que vuelve a pedir
  `fetchMe()` y actualiza el `psicologo` en el estado del contexto, para que el
  resto de la app (ej. el nombre en el header) se actualice sin recargar la pagina.
- `frontend/src/layouts/AppLayout.tsx`: el link con el nombre del psicologo
  (`{psicologo?.nombre}`) necesita un fallback para cuando `nombre` este vacio,
  ej. `{psicologo?.nombre || psicologo?.email}`.
- `frontend/src/pages/AdminSolicitudesPage.tsx`: la linea `Cedula: {item.psicologo_cedula}`
  y el nombre mostrado deben manejar el caso de string vacio (ej. mostrar
  "Sin nombre" / omitir la linea de cedula si esta vacia), porque un psicologo
  pendiente de autorizar puede no haber completado su perfil todavia.

## Fuera de alcance (no se toca en este cambio)

- Cambiar email desde Perfil (no se pidio; la contrasena si queda en alcance,
  ver arriba).
- Invalidar de inmediato otros tokens/sesiones activas al cambiar la contrasena
  (ver "Analisis: ¿cambiar la contrasena requiere actualizar sesion/token?" —
  requeriria infraestructura nueva con estado; queda como riesgo diferido).
- Notificar por correo al psicologo cuando cambia su contrasena (practica comun
  de seguridad, pero no se pidio y el servicio de correo ya existente
  (`app/services/mail.py`) esta pensado para envios de historia clinica, no para
  notificaciones transaccionales de cuenta).
- Migracion de base de datos / volver `nombre`/`cedula` `NULL`-ables (descartado,
  se usa `''` como valor vacio).
- `avatar_url`: no estaba en el registro ni se muestra hoy en Perfil; no se agrega
  como parte de este cambio para no ampliar el alcance.
- Cualquier flujo para "solicitar cambio de rol" despues del registro
  (`solicita_admin` se mantiene solo como parte del registro inicial).

## Riesgos identificados y diferidos

- Un token emitido antes de un cambio de contrasena sigue siendo valido hasta que
  expira por su cuenta (hasta 120 minutos), aunque la contrasena ya haya cambiado.
  Mitigacion futura (no implementada ahora): agregar `password_changed_at` al
  psicologo, incluirlo como claim al emitir el token, y compararlo en
  `get_current_psicologo` en cada request. Mismo criterio de "diferir hasta que
  haya uso real en produccion" ya usado con el rate limiting de login.

## Impacto en tests existentes (backend)

- `backend/app/tests/utils.py::register_psicologo`: hoy arma el payload con
  `cedula`/`nombre`. Se debe actualizar para que solo mande `email`, `password`,
  `consultorio_id`, `solicita_admin` (coincidiendo con el nuevo
  `PsicologoRegisterRequest`).
- `backend/app/tests/test_auth_token_risks.py`: el kwarg `cedula="9990001"` que se
  agrego para sortear el limite de longitud dejara de ser necesario/valido (la
  causa raiz de ese ajuste desaparece junto con el campo).
- Revisar `test_auth_registration.py` y `test_admin_authorization.py` por
  asserts que comparen `nombre`/`cedula` devueltos contra un valor enviado en el
  registro (ya no habra tal valor que comparar).

## Tests nuevos a agregar

- Backend: `PUT /auth/me` — actualizacion exitosa (parcial y completa), 401 sin
  autenticacion, 422 con datos invalidos (ej. `nombre` de 1 caracter), y que un
  psicologo no pueda modificar el perfil de otro (el endpoint no recibe id, solo
  actualiza al usuario del token, asi que esto es estructuralmente imposible, pero
  vale un test que lo documente).
- Backend: `PUT /auth/me/password` — cambio exitoso (verificar con un login
  posterior que la contrasena nueva funciona y la vieja ya no), `current_password`
  incorrecta -> 400, `new_password` invalida (muy corta) -> 422, sin autenticacion
  -> 401, y prueba explicita de que el mismo token sigue funcionando (`GET /auth/me`
  con el token anterior responde 200) inmediatamente despues del cambio — esto
  confirma en codigo el analisis de "sesion/token" de mas arriba.
- Frontend: `ProfilePage.test.tsx` (nuevo) — formulario de datos del perfil: carga
  los valores actuales, guarda cambios y muestra confirmacion, muestra error si
  falla. Formulario de contrasena: cambio exitoso limpia el formulario y muestra
  confirmacion, error de "contrasena actual incorrecta" se muestra, error de
  "las contrasenas nuevas no coinciden" se valida antes de llamar a la API.
  `AuthContext.test.tsx` — nuevo caso para `refreshMe()`.

## Orden de ejecucion sugerido (para cuando se apruebe)

1. Backend: `schemas/auth.py` (schemas, incluyendo `PasswordChangeRequest`) ->
   `routes/auth.py` (`register` recortado + `PUT /auth/me` + `PUT /auth/me/password`)
   -> actualizar `tests/utils.py` y los tests existentes afectados -> tests nuevos
   de `PUT /auth/me` y `PUT /auth/me/password` -> `pytest`.
2. Frontend: `types.ts` -> `client.ts` (`updateMe` + `changeMyPassword`) ->
   `AuthContext.tsx` (`refreshMe`) -> `RegisterPage.tsx` (recorte) ->
   `ProfilePage.tsx` (formulario de datos + formulario de contrasena) ->
   `AppLayout.tsx` / `AdminSolicitudesPage.tsx` (fallbacks para vacio) -> tests
   nuevos/actualizados -> `vitest run` + `tsc --noEmit`.
