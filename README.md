# Historia Clinica Psicologica

Aplicacion multi-tenant para gestion de historias clinicas psicologicas.

Documentos base:

- `REQUERIMIENTOS.md`: requerimientos iniciales.
- `ANALISIS.md`: analisis aprobado y modelo de datos.
- `PLANIFICACION.md`: fases de implementacion y seguimiento.

## Instalacion local sin Docker (usuarios finales)

Si vas a instalar la aplicacion en un computador para usarla (no para
desarrollar), sigue `MANUAL-INSTALACION-LOCAL.md`. Es una guia paso a paso
pensada para alguien sin conocimientos de sistemas: instala Python, Node.js
y MySQL directamente en el computador (sin Docker) y deja dos scripts listos
para usar (`instalar.bat` una vez, `iniciar.bat` cada vez).

## Desarrollo local (con Docker)

1. Crear `.env` desde `.env.example`.
2. Levantar servicios:

```powershell
docker compose up --build
```

3. Aplicar migraciones:

```powershell
docker compose exec backend alembic upgrade head
```

4. Cargar datos semilla:

```powershell
docker compose exec backend python -m app.db.seed
```

URLs locales:

- Frontend: http://localhost:5173
- Backend: http://localhost:8000
- Docs API: http://localhost:8000/docs
- Healthcheck: http://localhost:8000/health

Estos comandos manuales son para desarrollo activo (ej. `uvicorn --reload`).
Para una instalacion normal en un computador de usuario final, usa
`instalar.bat` / `iniciar.bat` como se describe arriba — automatizan estos
mismos pasos.

## Comandos backend sin Docker

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -e .[dev]
alembic upgrade head
python -m app.db.seed
uvicorn app.main:app --reload
```

## Comandos frontend sin Docker

```powershell
cd frontend
npm install
npm run dev
```
