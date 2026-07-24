from fastapi import APIRouter

from app.api.routes import auth, catalog, clinical, health

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(health.router)
api_router.include_router(catalog.router)
api_router.include_router(auth.router)
api_router.include_router(auth.admin_router)
api_router.include_router(clinical.router)
