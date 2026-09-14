from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.security import create_access_token, get_password_hash, verify_password
from app.db import models
from app.db.database import get_db
from app.schemas import user_schemas

router = APIRouter()


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register_parent(payload: user_schemas.ParentRegister, db: Session = Depends(get_db)):
    email = payload.email.lower()
    existing_user = db.query(models.ParentUser).filter(models.ParentUser.email == email).first()
    if existing_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
    new_user = models.ParentUser(email=email, hashed_password=get_password_hash(payload.password))
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"id": new_user.id, "email": new_user.email, "message": "Parent registered successfully!"}


@router.post("/login")
def login_parent(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    email = form_data.username.lower()
    user = db.query(models.ParentUser).filter(models.ParentUser.email == email).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(data={"sub": str(user.id), "role": "parent"})
    return {"access_token": access_token, "token_type": "bearer"}
