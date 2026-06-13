from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db.database import engine, Base
from app.api.v1.user import growth, auth as user_auth, children, logs
from app.api.v1.admin import auth as admin_auth, datasets, region
from app.api.v1.admin import datasets, food 
from app.api.v1.admin import region, auth 

Base.metadata.create_all(bind=engine)

app = FastAPI(title="SIMBA Backend API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(user_auth.router, prefix="/api/v1/user/auth", tags=["User Authentication"])
app.include_router(children.router, prefix="/api/v1/user/children", tags=["Child Profiles"])
app.include_router(growth.router, prefix="/api/v1/user", tags=["User Growth Tracking"])
app.include_router(logs.router, prefix="/api/v1/user", tags=["User Nutrition Logs"])

app.include_router(admin_auth.router, prefix="/api/v1/admin/auth", tags=["Admin Authentication"])
app.include_router(datasets.router, prefix="/api/v1/admin/datasets", tags=["Admin Datasets"])
app.include_router(region.router, prefix="/api/v1/admin", tags=["Admin Regional Dashboard"])
app.include_router(food.router, prefix="/api/v1/admin/foods", tags=["admin foods"])

@app.get("/")
def read_root():
    return {"message": "Welcome to the SIMBA API"}
