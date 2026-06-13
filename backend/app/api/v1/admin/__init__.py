from fastapi import APIRouter
from . import datasets, food

router = APIRouter()

router.include_router(datasets.router, prefix="/datasets", tags=["datasets"])
router.include_router(food.router, prefix="/foods", tags=["foods"])