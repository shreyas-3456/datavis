from fastapi import APIRouter
from app.api.v1.endpoints import auth
from app.api.v1.endpoints import dataset

router = APIRouter()
router.include_router(auth.router)
router.include_router(dataset.router)