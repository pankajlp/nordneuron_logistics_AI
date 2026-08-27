"""HS Code Finder endpoints."""
from typing import List

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/api/hs", tags=["hs-codes"])


@router.get("", response_model=List[schemas.HsCodeOut])
def list_hs_codes(db: Session = Depends(get_db)):
    return db.query(models.HsCode).all()


@router.get("/search", response_model=List[schemas.HsCodeOut])
def search_hs_codes(
    q: str = Query("", description="Commodity description or HS code fragment"),
    db: Session = Depends(get_db),
):
    query = (q or "").strip().lower()
    if len(query) < 2:
        return []

    results = []
    for item in db.query(models.HsCode).all():
        keywords = item.keywords or []
        keyword_hit = any(query in k or k in query for k in keywords)
        code_hit = query in item.code.lower()
        desc_hit = query in (item.description or "").lower()
        if keyword_hit or code_hit or desc_hit:
            results.append(item)
    return results
