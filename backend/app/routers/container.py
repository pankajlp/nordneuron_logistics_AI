"""Container Load Planner endpoints."""
from fastapi import APIRouter

from .. import schemas, services

router = APIRouter(prefix="/api/container", tags=["container"])


@router.post("/pack", response_model=schemas.PackOut)
def pack(payload: schemas.PackIn):
    return services.compute_packing(
        container_size=payload.container_size,
        cartons=payload.cartons.model_dump(),
        pallets=payload.pallets.model_dump(),
    )
