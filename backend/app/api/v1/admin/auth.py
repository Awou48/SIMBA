from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.security import (
    create_access_token,
    get_current_admin,
    get_current_superadmin,
    get_password_hash,
    verify_password,
)
from app.db import models
from app.db.database import get_db
from app.schemas import admin_schemas

router = APIRouter()


@router.post(
    "/register",
    response_model=admin_schemas.AdminResponse,
    status_code=status.HTTP_201_CREATED,
)
def register_admin(
    payload: admin_schemas.AdminCreate,
    db: Session = Depends(get_db),
    _: models.AdminUser = Depends(get_current_superadmin),
):
    """Create another admin. Only superadmins may do this; the first superadmin
    is bootstrapped by seed_db.py."""
    email = payload.email.lower()
    if db.query(models.AdminUser).filter(models.AdminUser.email == email).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    new_admin = models.AdminUser(
        email=email,
        name=payload.name,
        hashed_password=get_password_hash(payload.password),
        is_superadmin=1 if payload.is_superadmin else 0,
    )
    db.add(new_admin)
    db.commit()
    db.refresh(new_admin)
    return new_admin


@router.post("/login")
def login_admin(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    email = form_data.username.lower()
    admin = db.query(models.AdminUser).filter(models.AdminUser.email == email).first()
    if not admin or not verify_password(form_data.password, admin.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect admin email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(data={"sub": str(admin.id), "role": "admin"})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "admin_info": {
            "id": admin.id,
            "email": admin.email,
            "name": admin.name,
            "is_superadmin": bool(admin.is_superadmin),
        },
    }


@router.get("/me", response_model=admin_schemas.AdminResponse)
def read_current_admin(admin: models.AdminUser = Depends(get_current_admin)):
    return admin
