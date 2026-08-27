"""Reference / master-data endpoints (ports, carriers, container types, etc.)."""
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/api/reference", tags=["reference"])


@router.get("/ports", response_model=List[schemas.PortOut])
def list_ports(db: Session = Depends(get_db)):
    return db.query(models.Port).order_by(models.Port.name).all()


@router.get("/carriers", response_model=List[schemas.CarrierOut])
def list_carriers(db: Session = Depends(get_db)):
    return db.query(models.Carrier).order_by(models.Carrier.name).all()


@router.get("/container-types", response_model=List[schemas.ContainerTypeOut])
def list_container_types(db: Session = Depends(get_db)):
    return db.query(models.ContainerType).all()


@router.get("/commodities", response_model=List[schemas.CommodityOut])
def list_commodities(db: Session = Depends(get_db)):
    return db.query(models.Commodity).order_by(models.Commodity.name).all()


@router.get("/incoterms", response_model=List[schemas.IncotermOut])
def list_incoterms(db: Session = Depends(get_db)):
    return db.query(models.Incoterm).all()


@router.get("/seasons", response_model=List[schemas.SeasonOut])
def list_seasons(db: Session = Depends(get_db)):
    return db.query(models.Season).all()
