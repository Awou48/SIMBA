from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.admin import auth as admin_auth
from app.api.v1.admin import datasets, food
from app.api.v1.admin import milestones as admin_milestones
from app.api.v1.admin import region
from app.api.v1.user import auth as user_auth
from app.api.v1.user import children, growth, logs
from app.api.v1.user import milestones as user_milestones
from app.core.config import settings
from app.db import models  # noqa: F401  (register models with Base before create_all)
from app.db.database import engine
from app.db.migrate import sync_schema

# Dev convenience: create missing tables/columns on startup. Use seed_db.py for data.
sync_schema(engine)

app = FastAPI(title="SIMBA Backend API", version="1.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Parent (mobile) API
app.include_router(user_auth.router, prefix="/api/v1/user/auth", tags=["User Authentication"])
app.include_router(children.router, prefix="/api/v1/user/children", tags=["Child Profiles"])
app.include_router(growth.router, prefix="/api/v1/user", tags=["User Growth Tracking"])
app.include_router(logs.router, prefix="/api/v1/user", tags=["User Nutrition Logs"])
app.include_router(user_milestones.router, prefix="/api/v1/user", tags=["User Milestones"])

# Admin (web) API
app.include_router(admin_auth.router, prefix="/api/v1/admin/auth", tags=["Admin Authentication"])
app.include_router(datasets.router, prefix="/api/v1/admin/datasets", tags=["Admin Datasets"])
app.include_router(region.router, prefix="/api/v1/admin", tags=["Admin Regional Dashboard"])
app.include_router(food.router, prefix="/api/v1/admin/foods", tags=["Admin Foods"])
app.include_router(admin_milestones.router, prefix="/api/v1/admin/milestones", tags=["Admin Milestones"])


@app.get("/")
def read_root():
    return {"message": "Welcome to the SIMBA API", "docs": "/docs"}


@app.get("/health")
def health():
    return {"status": "ok"}


# Run from the backend/ directory:  uvicorn main:app --reload
