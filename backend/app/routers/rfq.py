"""RFQ Analyzer endpoints: multi-format document extraction + persistence.

Extraction handles Excel (.xlsx/.xls), Word (.docx), PDF (.pdf) and CSV, mapping
arbitrary headers/labels onto the standard RFQ column dictionary (extractor.py +
standard_fields.py). If a document cannot be parsed into >=2 fields, a
keyword-driven sample from the DB is returned instead.
"""
from typing import List

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..extractor import extract_document
from ..standard_fields import CORE_FIELD_MAP

router = APIRouter(prefix="/api/rfq", tags=["rfq"])


@router.post("/extract", response_model=schemas.RfqExtractOut)
async def extract(file: UploadFile = File(...), db: Session = Depends(get_db)):
    raw = await file.read()
    result = None
    try:
        result = extract_document(file.filename or "", raw)
    except Exception:  # noqa: BLE001 - fall back to sample data on any parse error
        result = None

    if result and result["match_count"] >= 2:
        return {
            "data": result["core"],
            "fields": result["fields"],
            "format": result["format"],
            "match_count": result["match_count"],
            "source": "parsed",
        }

    # Fallback: keyword-driven sample extraction from the DB.
    name = (file.filename or "").lower()
    samples = db.query(models.RfqExtractionSample).all()
    chosen = next((s for s in samples if any(k in name for k in (s.keywords or []))), None)
    if chosen is None:
        chosen = next((s for s in samples if s.is_default), None)
    if chosen is None:
        raise HTTPException(status_code=500, detail="No extraction samples seeded")

    core = {
        "pol": chosen.pol, "pod": chosen.pod, "container": chosen.container,
        "volume": chosen.volume, "incoterms": chosen.incoterms,
        "commodity": chosen.commodity, "carrier": chosen.carrier, "validity": chosen.validity,
    }
    fields = {std: core[form] for form, std in CORE_FIELD_MAP.items() if core.get(form)}
    return {
        "data": core,
        "fields": fields,
        "format": "sample",
        "match_count": len(fields),
        "source": "sample",
    }


@router.get("/standard-fields", response_model=List[schemas.StandardFieldOut])
def standard_fields(db: Session = Depends(get_db)):
    """The canonical ocean-freight RFQ column dictionary."""
    return db.query(models.RfqStandardField).order_by(models.RfqStandardField.id).all()


@router.get("", response_model=List[schemas.RfqOut])
def list_rfqs(db: Session = Depends(get_db)):
    return db.query(models.Rfq).order_by(models.Rfq.created_at.desc()).all()


@router.post("", response_model=schemas.RfqOut, status_code=201)
def create_rfq(payload: schemas.RfqCreate, db: Session = Depends(get_db)):
    rfq = models.Rfq(**payload.model_dump())
    db.add(rfq)
    db.commit()
    db.refresh(rfq)
    return rfq


@router.get("/{rfq_id}", response_model=schemas.RfqOut)
def get_rfq(rfq_id: int, db: Session = Depends(get_db)):
    rfq = db.get(models.Rfq, rfq_id)
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")
    return rfq


@router.delete("/{rfq_id}", status_code=204)
def delete_rfq(rfq_id: int, db: Session = Depends(get_db)):
    rfq = db.get(models.Rfq, rfq_id)
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")
    db.delete(rfq)
    db.commit()
