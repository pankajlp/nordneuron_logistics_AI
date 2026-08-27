"""Freight Calculator endpoints."""
from collections import defaultdict
from typing import Dict

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import models, schemas, services
from ..database import get_db

router = APIRouter(prefix="/api/freight", tags=["freight"])


def _load_tariffs(db: Session) -> Dict[str, Dict[str, float]]:
    table: Dict[str, Dict[str, float]] = defaultdict(dict)
    for row in db.query(models.FreightTariff).all():
        table[row.origin_key][row.container_type] = row.base_rate
    return table


@router.get("/tariffs")
def get_tariffs(db: Session = Depends(get_db)):
    return _load_tariffs(db)


@router.post("/quote", response_model=schemas.FreightQuoteOut)
def quote(payload: schemas.FreightQuoteIn, db: Session = Depends(get_db)):
    season = (
        db.query(models.Season).filter(models.Season.code == payload.season).first()
    )
    multiplier = season.multiplier if season else 1.0

    result = services.compute_freight(
        lane=payload.lane,
        container_type=payload.container_type,
        season_multiplier=multiplier,
        baf=payload.baf,
        congestion=payload.congestion,
        local=payload.local,
        margin_pct=payload.margin_pct,
        tariffs=_load_tariffs(db),
    )
    return result
