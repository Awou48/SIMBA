from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import get_current_admin
from app.db import models
from app.db.database import get_db
from app.schemas import admin_schemas

router = APIRouter(dependencies=[Depends(get_current_admin)])


def _get_or_404(article_id: int, db: Session) -> models.Article:
    a = db.query(models.Article).filter(models.Article.id == article_id).first()
    if not a:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Article not found")
    return a


@router.get("", response_model=List[admin_schemas.ArticleResponse])
def list_articles(db: Session = Depends(get_db)):
    return db.query(models.Article).order_by(models.Article.updated_at.desc(), models.Article.id.desc()).all()


@router.post("", response_model=admin_schemas.ArticleResponse, status_code=status.HTTP_201_CREATED)
def create_article(payload: admin_schemas.ArticleCreate, db: Session = Depends(get_db)):
    a = models.Article(**payload.model_dump())
    db.add(a)
    db.commit()
    db.refresh(a)
    return a


@router.put("/{article_id}", response_model=admin_schemas.ArticleResponse)
def update_article(article_id: int, payload: admin_schemas.ArticleCreate, db: Session = Depends(get_db)):
    a = _get_or_404(article_id, db)
    for key, value in payload.model_dump().items():
        setattr(a, key, value)
    db.commit()
    db.refresh(a)
    return a


@router.delete("/{article_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_article(article_id: int, db: Session = Depends(get_db)):
    db.delete(_get_or_404(article_id, db))
    db.commit()
    return None
