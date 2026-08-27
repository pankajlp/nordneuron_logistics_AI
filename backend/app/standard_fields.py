"""Canonical ocean-freight RFQ column dictionary.

This is the single source of truth for every column that can appear in an ocean
freight Request-for-Quotation / rate tender. It is:
  * seeded into the ``rfq_standard_fields`` table (see seed.py), and
  * used by the extractor (extractor.py) to map arbitrary spreadsheet / Word /
    PDF headers and labels onto these standard names.

Each entry:
  key          machine name (snake_case) - the standard column identifier
  name         human-readable standard name
  category     grouping for UI / documentation
  data_type    string | number | integer | date | boolean
  unit         optional unit hint
  synonyms     alternative header/label spellings seen in real RFQ documents
               (matched case-insensitively as whole tokens)

``synonyms`` deliberately favours specific, multi-word or abbreviated spellings
to avoid false matches; generic words like "to"/"from"/"date" are omitted.
"""

STANDARD_FIELDS = [
    # ---- Routing & geography ------------------------------------------------
    {"key": "trade_lane", "name": "Trade Lane", "category": "Routing", "data_type": "string",
     "synonyms": ["trade lane", "lane", "route", "trade", "corridor", "od pair", "o-d pair"]},
    {"key": "pol", "name": "Port of Loading (POL)", "category": "Routing", "data_type": "string",
     "synonyms": ["port of loading", "pol", "loading port", "origin port", "port of load", "load port"]},
    {"key": "pod", "name": "Port of Discharge (POD)", "category": "Routing", "data_type": "string",
     "synonyms": ["port of discharge", "pod", "discharge port", "destination port", "port of discharge (pod)"]},
    {"key": "place_of_receipt", "name": "Place of Receipt", "category": "Routing", "data_type": "string",
     "synonyms": ["place of receipt", "por", "receipt", "pickup location", "origin door"]},
    {"key": "place_of_delivery", "name": "Place of Delivery", "category": "Routing", "data_type": "string",
     "synonyms": ["place of delivery", "final destination", "delivery place", "pod door", "destination door", "delivery location"]},
    {"key": "origin_country", "name": "Origin Country", "category": "Routing", "data_type": "string",
     "synonyms": ["origin country", "country of origin", "export country"]},
    {"key": "destination_country", "name": "Destination Country", "category": "Routing", "data_type": "string",
     "synonyms": ["destination country", "country of destination", "import country"]},
    {"key": "transhipment_port", "name": "Transhipment Port", "category": "Routing", "data_type": "string",
     "synonyms": ["transhipment", "transshipment", "t/s port", "via", "transhipment port"]},
    {"key": "routing", "name": "Routing", "category": "Routing", "data_type": "string",
     "synonyms": ["routing", "direct/transhipment", "service routing"]},

    # ---- Cargo --------------------------------------------------------------
    {"key": "commodity", "name": "Commodity", "category": "Cargo", "data_type": "string",
     "synonyms": ["commodity", "cargo description", "goods", "product", "description of goods", "cargo", "item", "goods description"]},
    {"key": "hs_code", "name": "HS Code", "category": "Cargo", "data_type": "string",
     "synonyms": ["hs code", "hts", "hs", "tariff code", "harmonized code", "hts code", "hs/hts"]},
    {"key": "cargo_weight", "name": "Cargo Weight", "category": "Cargo", "data_type": "number", "unit": "kg",
     "synonyms": ["cargo weight", "gross weight", "weight", "weight (kg)", "cargo weight (kg)", "total weight", "gross wt"]},
    {"key": "cargo_volume", "name": "Cargo Volume", "category": "Cargo", "data_type": "number", "unit": "CBM",
     "synonyms": ["cargo volume", "volume (cbm)", "cbm", "cargo volume (cbm)", "measurement", "vol (cbm)"]},
    {"key": "packages", "name": "Number of Packages", "category": "Cargo", "data_type": "integer",
     "synonyms": ["number of packages", "packages", "no. of packages", "no of pieces", "number of pieces", "pieces", "pkgs", "package count"]},
    {"key": "dangerous_goods", "name": "Dangerous Goods", "category": "Cargo", "data_type": "boolean",
     "synonyms": ["dangerous goods", "dg", "hazmat", "hazardous", "imo class", "imdg", "dg flag"]},
    {"key": "temperature", "name": "Temperature Requirement", "category": "Cargo", "data_type": "string", "unit": "C",
     "synonyms": ["temperature", "temperature req.", "reefer temp", "temp requirement", "set point", "temperature requirement"]},
    {"key": "stackable", "name": "Stackable", "category": "Cargo", "data_type": "boolean",
     "synonyms": ["stackable", "stackability"]},

    # ---- Equipment ----------------------------------------------------------
    {"key": "container_type", "name": "Container Type", "category": "Equipment", "data_type": "string",
     "synonyms": ["container type", "equipment", "equipment type", "container size", "equip", "size/type", "container", "equipment size"]},
    {"key": "container_quantity", "name": "Container Quantity", "category": "Equipment", "data_type": "integer",
     "synonyms": ["container quantity", "no. of containers", "number of containers", "quantity", "qty", "containers", "teu", "feu", "volume (containers)"]},
    {"key": "annual_volume", "name": "Annual Volume", "category": "Equipment", "data_type": "integer",
     "synonyms": ["annual volume", "yearly volume", "estimated annual volume", "annual teu", "est. annual volume", "volume p.a."]},

    # ---- Commercial & parties ----------------------------------------------
    {"key": "incoterms", "name": "Incoterms", "category": "Commercial", "data_type": "string",
     "synonyms": ["incoterms", "incoterm", "trade terms", "shipping terms", "terms of delivery"]},
    {"key": "service_type", "name": "Service Type", "category": "Commercial", "data_type": "string",
     "synonyms": ["service type", "service scope", "service mode", "movement type", "haulage type"]},
    {"key": "service_contract", "name": "Service Contract / Tender Ref", "category": "Commercial", "data_type": "string",
     "synonyms": ["service contract", "sc number", "contract number", "tender ref", "tender reference", "rfq number", "rfq reference", "quote reference", "contract no"]},
    {"key": "carrier", "name": "Carrier", "category": "Commercial", "data_type": "string",
     "synonyms": ["carrier", "shipping line", "ocean carrier", "line", "ssl", "steamship line", "operator", "shipping carrier"]},
    {"key": "named_account", "name": "Named Account / Shipper", "category": "Commercial", "data_type": "string",
     "synonyms": ["named account", "shipper", "customer", "account", "company name", "exporter"]},
    {"key": "consignee", "name": "Consignee", "category": "Commercial", "data_type": "string",
     "synonyms": ["consignee", "importer", "receiver", "notify party"]},

    # ---- Schedule & free time ----------------------------------------------
    {"key": "etd", "name": "ETD / Cargo Ready Date", "category": "Schedule", "data_type": "date",
     "synonyms": ["etd", "estimated etd", "estimated departure", "sailing date", "cargo ready date", "crd", "ready date"]},
    {"key": "transit_time", "name": "Transit Time", "category": "Schedule", "data_type": "integer", "unit": "days",
     "synonyms": ["transit time", "transit time (days)", "t/t", "transit", "transit days"]},
    {"key": "frequency", "name": "Frequency", "category": "Schedule", "data_type": "string",
     "synonyms": ["frequency", "sailings", "weekly departures", "sailing frequency", "departures per week"]},
    {"key": "free_time_origin", "name": "Free Time (Origin)", "category": "Schedule", "data_type": "integer", "unit": "days",
     "synonyms": ["free time origin", "origin free days", "origin free time", "free days origin"]},
    {"key": "free_time_destination", "name": "Free Time (Destination)", "category": "Schedule", "data_type": "integer", "unit": "days",
     "synonyms": ["free time destination", "detention & demurrage free days", "free days", "destination free time", "dem/det free days", "free time"]},

    # ---- Rates & charges ----------------------------------------------------
    {"key": "ocean_freight_rate", "name": "Ocean Freight Rate", "category": "Rates", "data_type": "number",
     "synonyms": ["ocean freight", "ocean freight rate", "base rate", "freight rate", "rate", "basic ocean freight", "sea freight"]},
    {"key": "currency", "name": "Currency", "category": "Rates", "data_type": "string",
     "synonyms": ["currency", "ccy", "cur", "curr"]},
    {"key": "baf", "name": "Bunker Adjustment Factor (BAF)", "category": "Rates", "data_type": "number",
     "synonyms": ["baf", "bunker adjustment factor", "bunker", "bunker surcharge", "baf/lss"]},
    {"key": "caf", "name": "Currency Adjustment Factor (CAF)", "category": "Rates", "data_type": "number",
     "synonyms": ["caf", "currency adjustment factor"]},
    {"key": "pss", "name": "Peak Season Surcharge (PSS)", "category": "Rates", "data_type": "number",
     "synonyms": ["pss", "peak season surcharge"]},
    {"key": "lss", "name": "Low Sulphur Surcharge (LSS)", "category": "Rates", "data_type": "number",
     "synonyms": ["lss", "low sulphur surcharge", "low sulfur surcharge"]},
    {"key": "thc_origin", "name": "THC Origin", "category": "Rates", "data_type": "number",
     "synonyms": ["thc origin", "origin thc", "terminal handling origin", "origin terminal handling"]},
    {"key": "thc_destination", "name": "THC Destination", "category": "Rates", "data_type": "number",
     "synonyms": ["thc destination", "destination thc", "terminal handling destination"]},
    {"key": "doc_fee", "name": "Documentation Fee", "category": "Rates", "data_type": "number",
     "synonyms": ["documentation fee", "doc fee", "b/l fee", "bill of lading fee", "docs fee", "bl fee"]},
    {"key": "isps", "name": "ISPS / Security Fee", "category": "Rates", "data_type": "number",
     "synonyms": ["isps", "security fee", "isps fee"]},
    {"key": "congestion_fee", "name": "Congestion Surcharge", "category": "Rates", "data_type": "number",
     "synonyms": ["congestion surcharge", "port congestion", "congestion fee", "congestion"]},
    {"key": "all_in_rate", "name": "All-in Rate", "category": "Rates", "data_type": "number",
     "synonyms": ["all-in rate", "all in rate", "total rate", "all-in", "total amount", "grand total"]},

    # ---- Validity & notes ---------------------------------------------------
    {"key": "validity_from", "name": "Validity From", "category": "Validity", "data_type": "date",
     "synonyms": ["validity from", "valid from", "rate validity from", "effective date", "valid since"]},
    {"key": "validity_to", "name": "Validity To", "category": "Validity", "data_type": "date",
     "synonyms": ["validity to", "valid until", "valid to", "expiry", "expiration", "rate expiry", "validity", "valid till"]},
    {"key": "remarks", "name": "Remarks", "category": "Validity", "data_type": "string",
     "synonyms": ["remarks", "comments", "notes", "remark", "special instructions"]},
]

# Fast lookup helpers -------------------------------------------------------
FIELDS_BY_KEY = {f["key"]: f for f in STANDARD_FIELDS}

# The 8 "core" fields the classic RFQ form still uses, mapped to standard keys.
CORE_FIELD_MAP = {
    "pol": "pol",
    "pod": "pod",
    "container": "container_type",
    "volume": "container_quantity",
    "incoterms": "incoterms",
    "commodity": "commodity",
    "carrier": "carrier",
    "validity": "validity_to",
}
