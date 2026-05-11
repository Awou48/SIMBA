from datetime import datetime, timedelta
from passlib.context import CryptContext
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db import models
from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/user/auth/login")
admin_oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/admin/auth/login")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id_str = payload.get("sub")
        role = payload.get("role")
        if user_id_str is None or role != "parent":
            raise HTTPException(status_code=401, detail="Invalid credentials or role")
        user_id = int(user_id_str)
        
    except jwt.PyJWTError as e:
        print(f"\nJWT Decode Failed: {e}\n")
        raise HTTPException(status_code=401, detail=f"JWT Error: {str(e)}")
    
    user = db.query(models.ParentUser).filter(models.ParentUser.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user

def get_current_admin(token: str = Depends(admin_oauth2_scheme), db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        admin_id_str = payload.get("sub")
        role = payload.get("role")
        if admin_id_str is None or role != "admin":
            raise HTTPException(status_code=403, detail="Not authorized as Admin")
        admin_id = int(admin_id_str)
        
    except jwt.PyJWTError as e:
        print(f"\nAdmin JWT Decode Failed: {e}\n")
        raise HTTPException(status_code=401, detail="Invalid admin token")

    admin = db.query(models.AdminUser).filter(models.AdminUser.id == admin_id).first()
    if admin is None:
        raise HTTPException(status_code=404, detail="Admin not found")
    return admin