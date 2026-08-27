"""Seed the database with dummy data.

Every value here mirrors what the frontend used to hard-code. Swap these lists
for real data (or load them from a CSV/API) to go live -- the rest of the app
does not change.

Run standalone:  python -m app.seed
"""
from datetime import datetime

from .database import Base, SessionLocal, engine
from . import models
from .standard_fields import STANDARD_FIELDS


PORTS = [
    ("LAX", "USLAX", "Los Angeles", "United States"),
    ("RTM", "NLRTM", "Rotterdam", "Netherlands"),
    ("SIN", "SGSIN", "Singapore", "Singapore"),
    ("NYC", "USNYC", "New York", "United States"),
    ("CNSHA", "CNSHA", "Shanghai", "China"),
    ("CNSZX", "CNSZX", "Shenzhen", "China"),
    ("CNNGB", "CNNGB", "Ningbo", "China"),
    ("HAM", "DEHAM", "Hamburg", "Germany"),
]

CARRIERS = [
    ("MAERSK", "Maersk Line", "MAEU"),
    ("MSC", "MSC Mediterranean", "MSCU"),
    ("CMA CGM", "CMA CGM Group", "CMDU"),
    ("ONE", "Ocean Network Express", "ONEY"),
    ("COSCO", "COSCO Shipping", "COSU"),
]

CONTAINER_TYPES = [
    # code, name, length, width, height (m), max payload (kg)
    ("20GP", "20ft Standard (GP)", 5.90, 2.35, 2.39, 28200),
    ("40GP", "40ft Standard (GP)", 12.03, 2.35, 2.39, 26700),
    ("40HC", "40ft High Cube (HC)", 12.03, 2.35, 2.69, 26500),
    ("45HC", "45ft High Cube (HC)", 13.55, 2.35, 2.69, 25800),
]

COMMODITIES = [
    "Consumer Electronics",
    "Industrial Machinery Parts",
    "Apparel & Textiles",
    "Automotive Spare Parts",
    "Furniture & Fixtures",
    "Packaged Foodstuffs",
]

INCOTERMS = [
    ("FOB", "Free on Board"),
    ("CIF", "Cost, Insurance & Freight"),
    ("EXW", "Ex Works"),
    ("DDP", "Delivered Duty Paid"),
    ("FCA", "Free Carrier"),
    ("DAP", "Delivered at Place"),
]

SEASONS = [
    ("standard", "Standard Season", 1.00),
    ("peak", "Peak Season (+15%)", 1.15),
    ("slack", "Slack Season (-10%)", 0.90),
]

# origin_key -> {container: base_rate}
FREIGHT_TARIFFS = {
    "shanghai": {"20GP": 2100, "40GP": 3000, "40HC": 3400},
    "shenzhen": {"20GP": 2300, "40GP": 3200, "40HC": 3600},
    "ningbo": {"20GP": 2150, "40GP": 3100, "40HC": 3450},
    "default": {"20GP": 2200, "40GP": 3150, "40HC": 3500},
}

HS_CODES = [
    {
        "code": "9503.00.00",
        "keywords": ["toy", "toys", "plastic toy", "doll", "game"],
        "description": "Tricycles, scooters, pedal cars and similar wheeled toys; dolls' carriages; dolls; other toys; reduced-size ('scale') models and similar recreational models, working or not; puzzles of all kinds.",
        "duty": "0.0%", "vat": "18.0%", "status": "Allowed", "badge": "badge-success",
        "notes": "Subject to Consumer Product Safety Commission (CPSC) certification. No heavy metals allowed in pigments.",
    },
    {
        "code": "8708.29.90",
        "keywords": ["car", "automobile", "spare parts", "engine", "brakes", "gearbox"],
        "description": "Parts and accessories of the motor vehicles of headings 8701 to 8705: Other parts and accessories of bodies (including cabs): Other.",
        "duty": "2.5%", "vat": "19.0%", "status": "Allowed", "badge": "badge-success",
        "notes": "Requires manufacturer safety certification. Certain friction materials are regulated for asbestos content.",
    },
    {
        "code": "8507.60.00",
        "keywords": ["lithium", "battery", "batteries", "powerbank", "cell"],
        "description": "Electric accumulators, including separators therefor, whether or not rectangular (including square); lithium-ion accumulators.",
        "duty": "3.4%", "vat": "20.0%", "status": "Restricted", "badge": "badge-warning",
        "notes": "Classified as dangerous goods (Class 9). Must comply with UN38.3 transport standards. Special carrier approval needed.",
    },
    {
        "code": "0901.21.00",
        "keywords": ["coffee", "coffee beans", "espresso", "caffeine"],
        "description": "Coffee, whether or not roasted or decaffeinated; roasted: Not decaffeinated.",
        "duty": "0.0%", "vat": "7.0%", "status": "Restricted", "badge": "badge-warning",
        "notes": "FDA bio-terrorism registration required for import. Phyto-sanitary inspection is mandatory at arrival port.",
    },
    {
        "code": "6912.00.44",
        "keywords": ["cup", "mug", "ceramic", "porcelain", "pottery"],
        "description": "Ceramic tableware, kitchenware, other household articles and toilet articles, other than of porcelain or china: Mug-shaped cups.",
        "duty": "4.5%", "vat": "19.0%", "status": "Allowed", "badge": "badge-success",
        "notes": "Food contact safety declaration (lead & cadmium release limits) must accompany customs entry paperwork.",
    },
    {
        "code": "6109.10.00",
        "keywords": ["t-shirt", "shirt", "clothing", "apparel", "cotton"],
        "description": "T-shirts, singlets and other vests, knitted or crocheted, of cotton.",
        "duty": "16.5%", "vat": "21.0%", "status": "Allowed", "badge": "badge-success",
        "notes": "Textile origin declaration required. High tariff rates apply. Check for active bilateral country quotas.",
    },
    {
        "code": "3824.99.92",
        "keywords": ["chemical", "acid", "toxic", "hazardous"],
        "description": "Chemical products and preparations of the chemical or allied industries (including those consisting of mixtures of natural products), not elsewhere specified or included.",
        "duty": "6.5%", "vat": "19.0%", "status": "Hazardous / Restricted", "badge": "badge-danger",
        "notes": "EPA TSCA import certificate required. Subject to OSHA hazardous communication standards. Strict cargo declarations.",
    },
]

# port_code, carrier_code, free_days, daily_rate
DEMURRAGE_TARIFFS = [
    ("LAX", "MAERSK", 5, 180), ("LAX", "MSC", 4, 195), ("LAX", "CMA", 5, 185),
    ("RTM", "MAERSK", 7, 150), ("RTM", "MSC", 6, 165), ("RTM", "CMA", 6, 160),
    ("SIN", "MAERSK", 5, 140), ("SIN", "MSC", 5, 150), ("SIN", "CMA", 4, 155),
    ("NYC", "MAERSK", 4, 210), ("NYC", "MSC", 4, 220), ("NYC", "CMA", 5, 205),
]

VESSELS = [
    ("ocean_atlas", "Ocean Atlas", "IMO 9811054", 14, 62, "Shanghai (CNSHA)", "Los Angeles (USLAX)"),
    ("pacific_crest", "Pacific Crest", "IMO 9400234", 13, 45, "Shanghai (CNSHA)", "Los Angeles (USLAX)"),
    ("aurora_express", "Aurora Express", "IMO 9743912", 15, 80, "Shanghai (CNSHA)", "Los Angeles (USLAX)"),
]

RFQ_SAMPLES = [
    {
        "keywords": ["eu", "rotterdam", "hamburg", "rate"], "is_default": False,
        "pol": "Shanghai (CNSHA)", "pod": "Rotterdam (NLRTM)", "container": "40HC",
        "volume": "24", "incoterms": "FOB", "commodity": "Industrial Machinery Parts",
        "carrier": "MSC", "validity": "2026-06-01 to 2026-12-31",
    },
    {
        "keywords": ["us", "la", "california", "los angeles", "ocean"], "is_default": False,
        "pol": "Shenzhen (CNSZX)", "pod": "Los Angeles (USLAX)", "container": "40GP",
        "volume": "12", "incoterms": "CIF", "commodity": "Apparel & Textiles",
        "carrier": "CMA CGM", "validity": "2026-07-01 to 2026-09-30",
    },
    {
        "keywords": ["default"], "is_default": True,
        "pol": "Shanghai (CNSHA)", "pod": "Los Angeles (USLAX)", "container": "40HC",
        "volume": "15", "incoterms": "FOB", "commodity": "Consumer Electronics",
        "carrier": "MAERSK", "validity": "2026-06-01 to 2026-12-31",
    },
]

# A couple of persisted example RFQs so the list endpoint is not empty.
RFQ_RECORDS = [
    {
        "pol": "Shanghai (CNSHA)", "pod": "Rotterdam (NLRTM)", "container": "40HC",
        "volume": "24", "incoterms": "FOB", "commodity": "Industrial Machinery Parts",
        "carrier": "MSC", "validity": "2026-06-01 to 2026-12-31",
        "source_filename": "eu_rates_q3.xlsx", "status": "extracted",
    },
    {
        "pol": "Shenzhen (CNSZX)", "pod": "Los Angeles (USLAX)", "container": "40GP",
        "volume": "12", "incoterms": "CIF", "commodity": "Apparel & Textiles",
        "carrier": "CMA CGM", "validity": "2026-07-01 to 2026-09-30",
        "source_filename": "us_ocean_bids.csv", "status": "extracted",
    },
]


def seed(*, reset: bool = False) -> None:
    if reset:
        Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # Idempotent: skip if already seeded.
        if db.query(models.HsCode).count() > 0 and not reset:
            print("Database already seeded; skipping. (use reset=True to reseed)")
            return

        db.add_all([models.Port(code=c, unlocode=u, name=n, country=co) for c, u, n, co in PORTS])
        db.add_all([models.Carrier(code=c, name=n, scac=s) for c, n, s in CARRIERS])
        db.add_all([
            models.ContainerType(code=c, name=n, length_m=l, width_m=w, height_m=h, max_payload_kg=p)
            for c, n, l, w, h, p in CONTAINER_TYPES
        ])
        db.add_all([models.Commodity(name=n) for n in COMMODITIES])
        db.add_all([models.Incoterm(code=c, name=n) for c, n in INCOTERMS])
        db.add_all([models.Season(code=c, name=n, multiplier=m) for c, n, m in SEASONS])

        for origin_key, table in FREIGHT_TARIFFS.items():
            for ctype, rate in table.items():
                db.add(models.FreightTariff(origin_key=origin_key, container_type=ctype, base_rate=rate))

        db.add_all([
            models.HsCode(
                code=h["code"], description=h["description"], duty_rate=h["duty"],
                vat_rate=h["vat"], status=h["status"], badge_class=h["badge"],
                notes=h["notes"], keywords=h["keywords"],
            ) for h in HS_CODES
        ])

        db.add_all([
            models.DemurrageTariff(port_code=p, carrier_code=c, free_days=fd, daily_rate=dr)
            for p, c, fd, dr in DEMURRAGE_TARIFFS
        ])

        db.add_all([
            models.Vessel(key=k, name=n, imo=i, base_transit_days=b, progress_pct=pr,
                          origin=o, destination=d)
            for k, n, i, b, pr, o, d in VESSELS
        ])

        db.add_all([models.RfqExtractionSample(**s) for s in RFQ_SAMPLES])
        db.add_all([models.Rfq(created_at=datetime.utcnow(), **r) for r in RFQ_RECORDS])

        # Canonical standard RFQ column dictionary.
        db.add_all([
            models.RfqStandardField(
                key=f["key"], name=f["name"], category=f["category"],
                data_type=f["data_type"], unit=f.get("unit"), synonyms=f["synonyms"],
            ) for f in STANDARD_FIELDS
        ])

        db.commit()
        print("Seed complete.")
    finally:
        db.close()


if __name__ == "__main__":
    import sys
    seed(reset="--reset" in sys.argv)
