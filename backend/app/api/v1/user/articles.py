from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db import models
from app.db.database import get_db
from app.schemas import user_schemas

router = APIRouter(dependencies=[Depends(get_current_user)])


@router.get("/articles", response_model=List[user_schemas.ArticleView])
def list_published_articles(category: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(models.Article).filter(models.Article.published.is_(True))
    if category and category.lower() != "all":
        q = q.filter(models.Article.category == category)
    return q.order_by(models.Article.updated_at.desc()).all()


@router.get("/articles/{article_id}", response_model=user_schemas.ArticleView)
def read_article(article_id: int, db: Session = Depends(get_db)):
    a = db.query(models.Article).filter(models.Article.id == article_id, models.Article.published.is_(True)).first()
    if not a:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Article not found")
    return a
