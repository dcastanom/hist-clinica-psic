#!/bin/sh
set -e

# alembic upgrade head y el seed son ambos idempotentes (no-op si ya estan
# aplicados / si los datos ya existen), asi que es seguro correrlos en cada
# arranque del contenedor, en vez de exigir un paso manual aparte en cada
# proveedor de nube.
alembic upgrade head
python -m app.db.seed

exec uvicorn app.main:app --host 0.0.0.0 --port 8000
