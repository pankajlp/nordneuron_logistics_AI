"""FastAPI application entry point for the NordNeuron Logistics AI backend."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import Base, engine
from .routers import container, demurrage, eta, freight, hs, reference, rfq, stats

app = FastAPI(
    title="NordNeuron Logistics AI API",
    description="Backend services for the RFQ, Freight, Container, HS, Demurrage and ETA modules.",
    version="1.0.0",
)

# The SPA is served from a different origin during development (http-server on
# :3000/:3131), so allow cross-origin calls. Tighten this in production.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    # Create tables and seed dummy data on first run.
    Base.metadata.create_all(bind=engine)
    from .seed import seed
    seed()


@app.get("/api/health", tags=["health"])
def health():
    return {"status": "ok", "service": "nordneuron-logistics-ai"}


for r in (reference, rfq, freight, hs, demurrage, eta, container, stats):
    app.include_router(r.router)
