"""Pydantic request/response schemas."""
from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


# --- Reference ------------------------------------------------------------
class PortOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    code: str
    unlocode: Optional[str] = None
    name: str
    country: Optional[str] = None


class CarrierOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    code: str
    name: str
    scac: Optional[str] = None


class ContainerTypeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    code: str
    name: str
    length_m: float
    width_m: float
    height_m: float
    max_payload_kg: float


class CommodityOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    name: str


class IncotermOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    code: str
    name: str


class SeasonOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    code: str
    name: str
    multiplier: float


# --- HS Codes -------------------------------------------------------------
class HsCodeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    code: str
    description: str
    duty_rate: str
    vat_rate: str
    status: str
    badge_class: str
    notes: str
    keywords: List[str] = []


# --- Freight --------------------------------------------------------------
class FreightQuoteIn(BaseModel):
    lane: str = ""
    container_type: str = "40HC"
    carrier: Optional[str] = None
    season: str = "standard"
    baf: float = 0
    congestion: float = 0
    local: float = 0
    margin_pct: float = Field(15, ge=0, lt=100)


class FreightQuoteOut(BaseModel):
    origin_key: str
    base_ocean: float
    total_surcharges: float
    allin_cost: float
    margin_pct: float
    profit: float
    sell_price: float
    history_labels: List[str]
    history_sell: List[float]
    history_cost: List[float]


# --- Demurrage ------------------------------------------------------------
class DemurrageIn(BaseModel):
    port: Optional[str] = None
    carrier: Optional[str] = None
    free_days: int = 5
    daily_rate: float = 180.0
    arrival_date: date
    pickup_date: date


class DemurrageOut(BaseModel):
    total_days: int
    overdue_days: int
    total_fee: float
    free_days: int
    daily_rate: float
    risk_level: str
    alert_title: str
    alert_desc: str
    cost_projection: List[float]
    cutoff_date: date


class DemurrageTariffOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    port_code: str
    carrier_code: str
    free_days: int
    daily_rate: float


# --- ETA ------------------------------------------------------------------
class VesselOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    key: str
    name: str
    imo: str
    base_transit_days: float
    progress_pct: float
    origin: str
    destination: str


class EtaPredictIn(BaseModel):
    vessel_key: str
    weather: int = Field(0, ge=0, le=2)      # 0 optimal, 1 moderate, 2 severe
    congestion: int = Field(0, ge=0, le=2)
    live_speed_knots: Optional[float] = None
    live_miles_remaining: Optional[float] = None


class EtaPredictOut(BaseModel):
    vessel_name: str
    vessel_imo: str
    predicted_date: date
    delay_days: float
    confidence: int
    progress_pct: float
    base_transit_days: float


# --- Container packing ----------------------------------------------------
class PackItem(BaseModel):
    length_cm: float
    width_cm: float
    height_cm: float
    weight_kg: float
    qty: int = 0


class PackIn(BaseModel):
    container_size: str = "40ft"    # 20ft / 40ft
    cartons: PackItem
    pallets: PackItem


class PackOut(BaseModel):
    container_size: str
    container_volume_m3: float
    cartons_fit: int
    cartons_requested: int
    pallets_fit: int
    pallets_requested: int
    used_volume_m3: float
    unused_volume_m3: float
    space_utilization_pct: float
    total_weight_kg: float
    forward_weight_kg: float
    aft_weight_kg: float
    weight_balance: str


# --- RFQ ------------------------------------------------------------------
class RfqBase(BaseModel):
    pol: Optional[str] = ""
    pod: Optional[str] = ""
    container: Optional[str] = ""
    volume: Optional[str] = ""
    incoterms: Optional[str] = ""
    commodity: Optional[str] = ""
    carrier: Optional[str] = ""
    validity: Optional[str] = ""


class RfqCreate(RfqBase):
    extra_fields: dict = Field(default_factory=dict)
    source_filename: Optional[str] = None
    status: str = "draft"


class RfqOut(RfqBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    extra_fields: dict = Field(default_factory=dict)
    source_filename: Optional[str] = None
    status: str
    created_at: datetime


class RfqExtractOut(BaseModel):
    data: RfqBase                 # the 8 classic form fields
    fields: dict = Field(default_factory=dict)   # ALL standard fields found {key: value}
    format: str                   # xlsx | docx | pdf | csv | sample
    match_count: int
    source: str                   # "parsed" | "sample"


class StandardFieldOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    key: str
    name: str
    category: str
    data_type: str
    unit: Optional[str] = None
    synonyms: List[str] = []


# --- Stats ----------------------------------------------------------------
class StatsOut(BaseModel):
    active_rfqs: int
    freight_savings: float
    volume_packed_pct: float
    demurrage_alerts: int
