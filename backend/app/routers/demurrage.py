"""Demurrage Calculator endpoints."""
import csv
import io
from typing import List, Optional

from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy.orm import Session

from .. import models, schemas, services
from ..database import get_db

router = APIRouter(prefix="/api/demurrage", tags=["demurrage"])


@router.get("/tariffs", response_model=List[schemas.DemurrageTariffOut])
def list_tariffs(
    port: Optional[str] = None,
    carrier: Optional[str] = None,
    db: Session = Depends(get_db),
):
    q = db.query(models.DemurrageTariff)
    if port:
        q = q.filter(models.DemurrageTariff.port_code == port)
    if carrier:
        # carrier codes in the tariff table use short forms (CMA vs "CMA CGM")
        q = q.filter(models.DemurrageTariff.carrier_code == carrier.split()[0])
    return q.all()


@router.post("/calculate", response_model=schemas.DemurrageOut)
def calculate(payload: schemas.DemurrageIn, db: Session = Depends(get_db)):
    surcharge_multiplier, surcharge_after = 1.5, 5
    if payload.port and payload.carrier:
        tariff = (
            db.query(models.DemurrageTariff)
            .filter(
                models.DemurrageTariff.port_code == payload.port,
                models.DemurrageTariff.carrier_code == payload.carrier.split()[0],
            )
            .first()
        )
        if tariff:
            surcharge_multiplier = tariff.surcharge_multiplier
            surcharge_after = tariff.surcharge_after_days

    return services.compute_demurrage(
        arrival_date=payload.arrival_date,
        pickup_date=payload.pickup_date,
        free_days=payload.free_days,
        daily_rate=payload.daily_rate,
        surcharge_multiplier=surcharge_multiplier,
        surcharge_after_days=surcharge_after,
    )


@router.post("/calibrate")
async def calibrate(file: UploadFile = File(...)):
    """Upload a CSV of historical demurrage payments to auto-calibrate the
    standard free-day allocation and daily rate using column averages.

    Expected (fuzzy) columns: free_days / allocated, daily_rate / rate / fee.
    """
    raw = (await file.read()).decode("utf-8", errors="ignore")
    reader = csv.DictReader(io.StringIO(raw))

    free_days_vals, rate_vals = [], []
    for row in reader:
        for key, value in row.items():
            key_l = (key or "").strip().lower()
            try:
                num = float(str(value).replace("$", "").replace(",", "").strip())
            except (TypeError, ValueError):
                continue
            if any(t in key_l for t in ("free", "allocated", "allowance")):
                free_days_vals.append(num)
            elif any(t in key_l for t in ("rate", "fee", "daily", "charge")):
                rate_vals.append(num)

    def avg(values, default):
        return round(sum(values) / len(values), 2) if values else default

    return {
        "rows_analyzed": len(free_days_vals) or len(rate_vals),
        "calibrated_free_days": int(round(avg(free_days_vals, 5))),
        "calibrated_daily_rate": avg(rate_vals, 180.0),
    }
