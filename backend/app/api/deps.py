from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db import models
from app.db.database import get_db


def get_owned_child(
    child_id: int,
    db: Session = Depends(get_db),
    current_user: models.ParentUser = Depends(get_current_user),
) -> models.Child:
    """Resolve a child by id, ensuring it belongs to the authenticated parent.

    Returns 404 for both "does not exist" and "belongs to someone else" so
    that child ids cannot be enumerated.
    """
    child = (
        db.query(models.Child)
        .filter(models.Child.id == child_id, models.Child.parent_id == current_user.id)
        .first()
    )
    if child is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Child not found")
    return child
