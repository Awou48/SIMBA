from typing import List

from fastapi import APIRouter, Depends
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.api.deps import get_owned_child
from app.db import models
from app.db.database import get_db
from app.schemas import user_schemas
from app.services.insights import build_alerts, build_report
from app.services.report_pdf import render_report_pdf

router = APIRouter()


@router.get("/child/{child_id}/alerts", response_model=List[user_schemas.AlertItem])
def get_alerts(child: models.Child = Depends(get_owned_child), db: Session = Depends(get_db)):
    """Early-warning alerts derived from the child's growth, nutrition, milestone and immunization data."""
    return build_alerts(child, db)


@router.get("/child/{child_id}/report")
def get_report(child: models.Child = Depends(get_owned_child), db: Session = Depends(get_db)):
    """Everything the Growth Report screen shows, as JSON."""
    return build_report(child, db)


@router.get("/child/{child_id}/report.pdf")
def get_report_pdf(child: models.Child = Depends(get_owned_child), db: Session = Depends(get_db)):
    pdf = render_report_pdf(build_report(child, db))
    filename = f"simba-report-{child.name.lower().replace(' ', '-')}-{child.id}.pdf"
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
