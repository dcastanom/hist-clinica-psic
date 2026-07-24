# Historia Clínica Psicológica — HistClinic

Aplicación web **multi-tenant** para el seguimiento de casos psicológicos en consultorios y clínicas.

---

## Funcionalidades

| Módulo | Descripción |
|---|---|
| **Multi-tenancy** | Cada consultorio es un *tenant* aislado. Los datos nunca se mezclan entre organizaciones. |
| **Pacientes** | Alta, edición, búsqueda y desactivación (soft-delete) de pacientes. |
| **Sesiones** | Registro de citas (presencial / virtual), cambio de estado (programada, realizada, cancelada, no asistió). |
| **Historia clínica** | Notas clínicas por sesión con etiquetas, editables y eliminables. |
| **Usuarios** | Psicólogos y administradores por tenant, con roles diferenciados. |
| **Autenticación** | JWT con aislamiento de tenant en cada petición. |

---

## Arquitectura

```
hist-clinica-psic/
├── backend/          # Node.js · Express · Prisma 5 · SQLite (dev)
│   ├── prisma/
│   │   └── schema.prisma
│   ├── src/
│   │   ├── app.js
│   │   ├── index.js
│   │   ├── middleware/
│   │   │   ├── auth.js      # JWT verification
│   │   │   └── tenant.js    # Tenant isolation (X-Tenant-Slug header)
│   │   └── routes/
│   │       ├── auth.js
│   │       ├── pacientes.js
│   │       ├── sesiones.js
│   │       ├── notas.js
│   │       └── usuarios.js
│   └── __tests__/
└── frontend/         # React 19 · Vite · react-router-dom
    └── src/
        ├── pages/
        ├── components/
        ├── services/
        └── hooks/
```

### Multi-tenancy

- Cada tabla de datos contiene `tenantId`.
- El tenant se resuelve por la cabecera HTTP **`X-Tenant-Slug`** en cada petición autenticada.
- El JWT también lleva el `tenantId`; si la cabecera no coincide con el token, la petición es rechazada.
- No existen rutas que permitan acceder a datos de un tenant diferente al del token activo.

---

## Puesta en marcha (desarrollo)

### Requisitos previos

- Node.js ≥ 18
- npm ≥ 9

### Backend

```bash
cd backend
cp .env.example .env          # ajustar JWT_SECRET antes de producción
npm install
npm run db:push               # crea la base de datos SQLite
npm start                     # http://localhost:3001
```

### Frontend

```bash
cd frontend
npm install
npm run dev                   # http://localhost:3000
```

El frontend en desarrollo hace proxy de `/api` → `http://localhost:3001`.

---

## Variables de entorno (backend)

| Variable | Descripción | Default |
|---|---|---|
| `DATABASE_URL` | URL de conexión a la base de datos | `file:./dev.db` |
| `JWT_SECRET` | Secreto para firmar tokens JWT | *(obligatorio)* |
| `JWT_EXPIRES_IN` | Tiempo de expiración del token | `7d` |
| `PORT` | Puerto del servidor | `3001` |

---

## API REST

### Autenticación

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/api/auth/register-tenant` | Crea nuevo consultorio + admin |
| `POST` | `/api/auth/login` | Inicia sesión (devuelve JWT) |
| `GET` | `/api/auth/me` | Perfil del usuario autenticado |

Las rutas protegidas requieren:
- Cabecera `Authorization: ******
- Cabecera `X-Tenant-Slug: <slug>`

### Pacientes

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/pacientes` | Listar (con búsqueda y paginación) |
| `POST` | `/api/pacientes` | Crear paciente |
| `GET` | `/api/pacientes/:id` | Obtener con sesiones recientes |
| `PATCH` | `/api/pacientes/:id` | Editar campos |
| `DELETE` | `/api/pacientes/:id` | Desactivar (soft-delete) |

### Sesiones

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/sesiones` | Listar (filtros: pacienteId, estado, fechas) |
| `POST` | `/api/sesiones` | Crear sesión |
| `GET` | `/api/sesiones/:id` | Obtener con notas clínicas |
| `PATCH` | `/api/sesiones/:id` | Editar / cambiar estado |
| `DELETE` | `/api/sesiones/:id` | Eliminar |

### Notas clínicas

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/notas` | Listar (filtro: sesionId) |
| `POST` | `/api/notas` | Crear nota |
| `GET` | `/api/notas/:id` | Obtener |
| `PATCH` | `/api/notas/:id` | Editar |
| `DELETE` | `/api/notas/:id` | Eliminar |

### Usuarios

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/usuarios` | Listar usuarios del tenant (admin) |
| `POST` | `/api/usuarios` | Crear usuario (admin) |
| `PATCH` | `/api/usuarios/:id` | Actualizar usuario |

---

## Tests

```bash
cd backend
npm test
```

22 tests de integración cubren autenticación, gestión de pacientes, sesiones y notas clínicas.

---

## Producción

Para producción se recomienda:

1. Reemplazar SQLite por **PostgreSQL** cambiando `provider` en `prisma/schema.prisma`.
2. Generar un `JWT_SECRET` aleatorio largo.
3. Servir el build del frontend desde un CDN o servidor estático.
4. Correr las migraciones con `npx prisma migrate deploy`.
