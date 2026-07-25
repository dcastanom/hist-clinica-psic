# Checklist de pruebas manuales (Fase 6)

Este checklist complementa la suite automatizada de backend (`backend/app/tests`, 33 pruebas). Cubre los flujos que solo tienen sentido verificar manualmente en el navegador: UI, impresión, responsive y experiencia de usuario.

Marca cada item mientras lo pruebas. Si algo falla, anota el paso y el resultado obtenido antes de reportarlo.

## Preparacion

- [x] Backend corriendo (`docker compose up -d mysql backend` + migraciones + seed aplicados).
- [x] Frontend corriendo (`npm run dev` en `frontend/`, `http://localhost:5173`).
- [x] Tener a mano el admin semilla: `admin@example.com` / `Admin12345!` (consultorio "Consultorio Demo").

## 1. Flujo end-to-end principal

- [x] **Login**: iniciar sesion con credenciales validas redirige a seleccion de consultorio o al home si solo hay un consultorio autorizado.
- [x] **Login invalido**: password incorrecta muestra mensaje de error sin redirigir.
- [x] **Registro**: crear un psicologo nuevo, eligiendo un consultorio del selector (no un ID a mano). Verifica que quede en estado "Pendiente de autorizacion".
- [x] **Seleccion de consultorio**: con un usuario que pertenece a mas de un consultorio, verificar que se puede cambiar el consultorio activo desde "Cambiar consultorio" y que el header refleja el nuevo consultorio.
- [x] **Usuario pendiente**: iniciar sesion con un usuario recien registrado (sin autorizar) y confirmar que no puede entrar al modulo clinico (queda en la pantalla de seleccion de consultorio mostrando "Pendiente").
- [x] **Autorizacion admin**: como admin, ir a "Solicitudes", autorizar al usuario pendiente. Volver a iniciar sesion con ese usuario y confirmar que ahora si accede.
- [x] **Rechazo admin**: registrar otro usuario de prueba y rechazarlo desde el panel admin; confirmar que su estado pasa a "Rechazado" y sigue sin poder operar.
- [x] **Crear paciente**: desde "Pacientes" > "Nuevo paciente", completar el formulario y guardar. Verificar que aparece en el listado y que la edad se calcula correctamente a partir de la fecha de nacimiento.
- [x] **Editar paciente**: modificar un dato (ej. telefono) y confirmar que persiste tras recargar.
- [x] **Buscar paciente**: usar el campo de busqueda por nombre y por documento.
- [x] **Crear proceso**: desde el detalle del paciente, crear un proceso con motivo de consulta, historia de vida, etc.
- [x] **Crear sesion con notas**: dentro del proceso, crear una sesion con numero y notas de sesion. Intentar crear otra con el mismo numero de sesion y confirmar que se rechaza (numero duplicado).
- [x] **Crear compromiso**: dentro de la sesion, agregar un compromiso, editarlo (cambiar estado a "Cumplido") y eliminarlo.
- [x] **Ver historia completa**: abrir "Historia clinica" del paciente y confirmar que muestra datos generales, todos los procesos, sesiones y compromisos.
- [x] **Imprimir historia**: usar el boton "Imprimir" y confirmar en la vista previa de impresion que la navegacion/botones no aparecen (`@media print`) y el contenido clinico si.
- [x] **Enviar por correo**: usar "Enviar por correo", elegir un tipo de documento y un email destino, confirmar que aparece el mensaje de confirmacion de envio.
- [x] **Desactivar paciente**: confirmar que un paciente desactivado desaparece del listado.
- [x] **Logout**: cerrar sesion y confirmar que rutas privadas redirigen a `/login`.

## 2. Multi-tenancy y permisos (verificacion visual, complementa los tests automatizados)

- [x] Con dos psicologos distintos autorizados en el mismo consultorio, confirmar que cada uno solo ve sus propios pacientes en el listado.
- [x] Confirmar que un psicologo no-admin no ve el enlace "Solicitudes" en la navegacion.
- [x] Confirmar que acceder manualmente a una URL de paciente ajeno (`/pacientes/<id-de-otro-psicologo>`) no muestra datos (pantalla de error o 404 manejado).

## 3. Estados de carga, error y confirmacion

- [x] Los listados (pacientes, procesos, sesiones, solicitudes) muestran "Cargando..." brevemente y no un flash de contenido vacio.
- [x] Un error de red o de API (ej. apagar el backend un momento) muestra un mensaje de error legible en vez de una pantalla en blanco.
- [x] Las acciones de guardar muestran estado "Guardando..." y deshabilitan el boton mientras se procesa.

## 4. Verificacion visual desktop y mobile

Probar en al menos dos anchos: desktop (~1280px) y mobile (~375px, usando las devtools del navegador en modo responsive).

- [x] Login / registro: formularios legibles y usables sin scroll horizontal.
- [x] Header y navegacion: en mobile, los links de navegacion se apilan/wrappean sin cortarse ni desbordar.
- [x] Listado de pacientes: la busqueda y las tarjetas de paciente se ven bien en mobile.
- [x] Detalle de paciente: el grid de datos generales (`profile-grid`) se apila en una columna en mobile.
- [x] Vista de sesion con compromisos: los botones de editar/eliminar no se encima con el texto del compromiso en mobile.
- [x] Historia clinica: la vista es legible en mobile; el boton "Imprimir" sigue siendo usable.
- [x] Ningun elemento produce scroll horizontal en la pagina completa (body) en ningun ancho probado.

## 5. Resultado

- [x] Todos los items anteriores pasaron sin hallazgos.
- [x] Hallazgos encontrados (listar aqui con pasos para reproducir):
