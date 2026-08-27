"""Dashboard stats endpoint."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/api/stats", tags=["stats"])


@router.get("", response_model=schemas.StatsOut)
def get_stats(db: Session = Depends(get_db)):
    active_rfqs = db.query(models.Rfq).count()
    # Derived dummy figures; replace with real aggregates when data is live.
    return {
        "active_rfqs": active_rfqs,
        "freight_savings": 14240.0,
        "volume_packed_pct": 91.4,
        "demurrage_alerts": 2,
    }
