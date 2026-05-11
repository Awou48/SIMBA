from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db import models
from app.core.security import verify_password, create_access_token
from datetime import timedelta
from app.core.config import settings
from app.core.security import get_password_hash

router = APIRouter()

from fastapi import APIRouter, Depends, HTTPException 

@router.post("/register")
def register_admin(email: str, password: str, name: str, db: Session = Depends(get_db)):
    existing_admin = db.query(models.AdminUser).filter(models.AdminUser.email == email).first()
    if existing_admin:
        raise HTTPException(status_code=400, detail="Email already registered")
        
    hashed_pw = get_password_hash(password)
    new_admin = models.AdminUser(email=email, hashed_password=hashed_pw, name=name)
    db.add(new_admin)
    db.commit()
    return {"message": "Admin registered successfully!"}

@router.post("/login")
def login_admin(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    admin = db.query(models.AdminUser).filter(models.AdminUser.email == form_data.username).first()
    if not admin or not verify_password(form_data.password, admin.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect admin email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(admin.id), "role": "admin"}, 
        expires_delta=access_token_expires
    )
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "admin_info": {
            "id": admin.id,
            "email": admin.email,
            "name": admin.name
        }
    }