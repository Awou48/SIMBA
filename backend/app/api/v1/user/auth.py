from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from app.schemas import user_schemas 
from app.core.security import get_password_hash
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db import models
from app.core.security import verify_password, create_access_token

router = APIRouter()

@router.post("/register")
def register_parent(email: str, password: str, db: Session = Depends(get_db)):
    existing_user = db.query(models.ParentUser).filter(models.ParentUser.email == email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    hashed_pw = get_password_hash(password)
    new_user = models.ParentUser(email=email, hashed_password=hashed_pw)
    db.add(new_user)
    db.commit()
    return {"message": "Parent registered successfully!"}

@router.post("/login")
def login_parent(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.ParentUser).filter(models.ParentUser.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    access_token = create_access_token(data={"sub": str(user.id), "role": "parent"})
    return {"access_token": access_token, "token_type": "bearer"}