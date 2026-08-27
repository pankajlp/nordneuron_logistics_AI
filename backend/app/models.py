"""SQLAlchemy ORM models.

Every table below is seeded with dummy data (see ``seed.py``) that mirrors the
values previously hard-coded in the frontend. Replacing the dummy data with real
data is a matter of re-seeding these tables or pointing the app at a populated
database.
"""
from datetime import datetime

from sqlalchemy import (
    JSON,
    Boolean,
    Column,
    DateTime,
    Float,
    Integer,
    String,
    Text,
)

from .database import Base


# ---------------------------------------------------------------------------
# Reference / master data
# ---------------------------------------------------------------------------
class Port(Base):
    __tablename__ = "ports"
    id = Column(Integer, primary_key=True)
    code = Column(String(10), unique=True, index=True)  # short code, e.g. LAX
    unlocode = Column(String(10))                        # e.g. USLAX
    name = Column(String(120))
    country = Column(String(80))


class Carrier(Base):
    __tablename__ = "carriers"
    id = Column(Integer, primary_key=True)
    code = Column(String(20), unique=True, index=True)   # e.g. MAERSK
    name = Column(String(120))
    scac = Column(String(10))


class ContainerType(Base):
    __tablename__ = "container_types"
    id = Column(Integer, primary_key=True)
    code = Column(String(10), unique=True, index=True)   # 20GP, 40GP, 40HC, 45HC
    name = Column(String(80))
    length_m = Column(Float)
    width_m = Column(Float)
    height_m = Column(Float)
    max_payload_kg = Column(Float)


class Commodity(Base):
    __tablename__ = "commodities"
    id = Column(Integer, primary_key=True)
    name = Column(String(120), unique=True)


class Incoterm(Base):
    __tablename__ = "incoterms"
    id = Column(Integer, primary_key=True)
    code = Column(String(10), unique=True, index=True)
    name = Column(String(120))


class Season(Base):
    __tablename__ = "seasons"
    id = Column(Integer, primary_key=True)
    code = Column(String(20), unique=True, index=True)   # standard / peak / slack
    name = Column(String(80))
    multiplier = Column(Float, default=1.0)


# ---------------------------------------------------------------------------
# Module data tables
# ---------------------------------------------------------------------------
class HsCode(Base):
    """HS Code Finder classification database."""
    __tablename__ = "hs_codes"
    id = Column(Integer, primary_key=True)
    code = Column(String(20), index=True)
    description = Column(Text)
    duty_rate = Column(String(10))   # kept as display strings ("2.5%")
    vat_rate = Column(String(10))
    status = Column(String(60))
    badge_class = Column(String(40))
    notes = Column(Text)
    keywords = Column(JSON)          # list[str] for fuzzy matching


class FreightTariff(Base):
    """Base ocean freight lookup by origin + container type."""
    __tablename__ = "freight_tariffs"
    id = Column(Integer, primary_key=True)
    origin_key = Column(String(40), index=True)  # shanghai / shenzhen / ningbo / default
    container_type = Column(String(10), index=True)
    base_rate = Column(Float)


class DemurrageTariff(Base):
    """Default free days + daily rate per port/carrier."""
    __tablename__ = "demurrage_tariffs"
    id = Column(Integer, primary_key=True)
    port_code = Column(String(10), index=True)
    carrier_code = Column(String(20), index=True)
    free_days = Column(Integer, default=5)
    daily_rate = Column(Float, default=180.0)
    surcharge_multiplier = Column(Float, default=1.5)   # after threshold
    surcharge_after_days = Column(Integer, default=5)


class Vessel(Base):
    """ETA Predictor vessel master data + last-known telemetry defaults."""
    __tablename__ = "vessels"
    id = Column(Integer, primary_key=True)
    key = Column(String(40), unique=True, index=True)   # ocean_atlas
    name = Column(String(120))
    imo = Column(String(20))
    base_transit_days = Column(Float)
    progress_pct = Column(Float)
    origin = Column(String(120))
    destination = Column(String(120))
    nautical_miles_total = Column(Float, default=5700)
    speed_knots = Column(Float, default=18.4)
    draft_m = Column(Float, default=12.5)


class Rfq(Base):
    """Persisted RFQ records (extracted or manually entered)."""
    __tablename__ = "rfqs"
    id = Column(Integer, primary_key=True)
    pol = Column(String(120))
    pod = Column(String(120))
    container = Column(String(20))
    volume = Column(String(20))
    incoterms = Column(String(20))
    commodity = Column(String(160))
    carrier = Column(String(80))
    validity = Column(String(80))
    # All standard fields the extractor found, keyed by standard field key.
    extra_fields = Column(JSON, default=dict)
    source_filename = Column(String(200), nullable=True)
    status = Column(String(40), default="draft")
    created_at = Column(DateTime, default=datetime.utcnow)


class RfqStandardField(Base):
    """The canonical ocean-freight RFQ column dictionary (see standard_fields.py).

    Seeded so the full set of standard columns lives in the database and can be
    served to the UI / mapped against arbitrary uploaded document headers.
    """
    __tablename__ = "rfq_standard_fields"
    id = Column(Integer, primary_key=True)
    key = Column(String(60), unique=True, index=True)
    name = Column(String(120))
    category = Column(String(40), index=True)
    data_type = Column(String(20))
    unit = Column(String(20), nullable=True)
    synonyms = Column(JSON)          # list[str]


class RfqExtractionSample(Base):
    """Keyword-driven dummy extractions used as a fallback when a document
    cannot be parsed (mirrors the old client-side mockExtractions)."""
    __tablename__ = "rfq_extraction_samples"
    id = Column(Integer, primary_key=True)
    keywords = Column(JSON)          # list[str] matched against filename
    is_default = Column(Boolean, default=False)
    pol = Column(String(120))
    pod = Column(String(120))
    container = Column(String(20))
    volume = Column(String(20))
    incoterms = Column(String(20))
    commodity = Column(String(160))
    carrier = Column(String(80))
    validity = Column(String(80))
