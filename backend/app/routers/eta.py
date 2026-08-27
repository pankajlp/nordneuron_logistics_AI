"""ETA Predictor endpoints."""
import random
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas, services
from ..database import get_db

router = APIRouter(prefix="/api/eta", tags=["eta"])


@router.get("/vessels", response_model=List[schemas.VesselOut])
def list_vessels(db: Session = Depends(get_db)):
    return db.query(models.Vessel).all()


@router.get("/vessels/{key}/telemetry")
def vessel_telemetry(key: str, weather: int = 0, db: Session = Depends(get_db)):
    """Simulated live AIS + marine weather payload for a vessel.

    Replace this body with a real AIS/OpenWeatherMap integration to go live;
    the response shape is what the frontend already renders.
    """
    vessel = db.query(models.Vessel).filter(models.Vessel.key == key).first()
    if not vessel:
        raise HTTPException(status_code=404, detail="Vessel not found")

    progress = vessel.progress_pct / 100.0
    lat = round(34.05 - (1 - progress) * 3 + (random.random() - 0.5) * 0.05, 4)
    lon = round(-118.24 + (1 - progress) * 5 + (random.random() - 0.5) * 0.05, 4)
    speed = round(17.5 + random.random() * 2, 1)
    draft = round(12.2 + random.random() * 0.5, 1)
    miles_remaining = round(vessel.nautical_miles_total * (1 - progress))

    weather_states = [
        {"status": "Optimal", "waves_m": 0.8, "wind_knots": 8, "wind_dir": "ENE", "visibility_miles": 10.0},
        {"status": "Moderate", "waves_m": 2.4, "wind_knots": 22, "wind_dir": "SW", "visibility_miles": 10.0},
        {"status": "Severe Cyclone", "waves_m": 6.8, "wind_knots": 52, "wind_dir": "WNW", "visibility_miles": 1.2},
    ]
    weather = max(0, min(2, weather))
    marine = weather_states[weather]

    return {
        "ais": {
            "vessel_imo": vessel.imo.replace("IMO ", ""),
            "vessel_name": vessel.name,
            "telemetry": {
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "coordinates": {"lat": lat, "lon": lon},
                "heading_degrees": 72.4,
                "speed_knots": speed,
                "draft_meters": draft,
            },
            "route_context": {
                "origin": vessel.origin,
                "destination": vessel.destination,
                "voyage_progress_pct": vessel.progress_pct,
                "nautical_miles_remaining": miles_remaining,
            },
        },
        "weather": {
            "query_coordinates": {"lat": lat, "lon": lon},
            "marine_forecast": {
                "sea_state": marine["status"],
                "wave_height_meters": marine["waves_m"],
                "wind_speed_knots": marine["wind_knots"],
                "wind_direction": marine["wind_dir"],
                "temperature_c": 18.5,
                "visibility_miles": marine["visibility_miles"],
            },
        },
    }


@router.post("/predict", response_model=schemas.EtaPredictOut)
def predict(payload: schemas.EtaPredictIn, db: Session = Depends(get_db)):
    vessel = db.query(models.Vessel).filter(models.Vessel.key == payload.vessel_key).first()
    if not vessel:
        raise HTTPException(status_code=404, detail="Vessel not found")

    result = services.compute_eta(
        base_transit_days=vessel.base_transit_days,
        progress_pct=vessel.progress_pct,
        weather=payload.weather,
        congestion=payload.congestion,
        live_speed_knots=payload.live_speed_knots,
        live_miles_remaining=payload.live_miles_remaining,
    )
    result["vessel_name"] = vessel.name
    result["vessel_imo"] = vessel.imo
    return result
