# NordNeuron Logistics AI — Backend

A FastAPI service that turns the suite's previously hard-coded mock values into a
real, database-backed API. It ships with **SQLite + dummy data** so it runs with
zero configuration, and the data layer is swappable for a real database.

## Run locally

```bash
cd backend
python -m venv .venv
# Windows:  .venv\Scripts\activate      macOS/Linux:  source .venv/bin/activate
pip install -r requirements.txt
python run.py            # or: uvicorn app.main:app --reload --port 8000
```

- API root: <http://localhost:8000>
- Interactive docs (Swagger UI): <http://localhost:8000/docs>
- On first start the tables are created and seeded automatically.

Re-seed manually (wipes and reloads dummy data):

```bash
python -m app.seed --reset
```

## Architecture

```
app/
  database.py     SQLAlchemy engine/session (SQLite by default)
  models.py       ORM tables (reference + per-module data)
  schemas.py      Pydantic request/response models
  services.py     Pure calculation logic (freight, demurrage, ETA, packing)
  seed.py         Dummy data — edit or replace to go live
  routers/        One router per module
    standard_fields.py  canonical ocean-freight RFQ column dictionary (46 columns + synonyms)
  extractor.py    multi-format table/field extractor (xlsx/xls/docx/pdf/csv)
  reference.py  ports, carriers, container types, commodities, incoterms, seasons
    rfq.py        document extraction + RFQ persistence (CRUD)
    freight.py    freight quote + tariff table
    hs.py         HS code search
    demurrage.py  tariff lookup, fee calculation, history calibration
    eta.py        vessel list, live-telemetry mock, ETA prediction
    container.py  3D bin-packing metrics
    stats.py      dashboard tiles
```

## Endpoints (all under `/api`)

| Module      | Method & path |
|-------------|---------------|
| Health      | `GET /health` |
| Reference   | `GET /reference/{ports,carriers,container-types,commodities,incoterms,seasons}` |
| RFQ         | `POST /rfq/extract` · `GET /rfq/standard-fields` · `GET/POST /rfq` · `GET/DELETE /rfq/{id}` |
| Freight     | `GET /freight/tariffs` · `POST /freight/quote` |
| HS Codes    | `GET /hs` · `GET /hs/search?q=` |
| Demurrage   | `GET /demurrage/tariffs` · `POST /demurrage/calculate` · `POST /demurrage/calibrate` |
| ETA         | `GET /eta/vessels` · `GET /eta/vessels/{key}/telemetry` · `POST /eta/predict` |
| Container   | `POST /container/pack` |
| Stats       | `GET /stats` |

## RFQ document extractor

`POST /rfq/extract` accepts an **Excel (.xlsx/.xls), Word (.docx), PDF (.pdf) or
CSV** document and returns the ocean-freight fields it recognises. It runs two
strategies over a normalised view of the document and merges them:

1. **Key-value** — `Label : value` pairs, whether spread across adjacent cells
   in a form (`POL | Shanghai`) or written as text lines (`POL: Shanghai`).
2. **Tabular** — a header row followed by data rows (carrier rate matrices).

Headers/labels are matched against the **canonical column dictionary** in
[`app/standard_fields.py`](app/standard_fields.py) — **46 standard ocean-freight
RFQ columns** (POL, POD, Place of Receipt/Delivery, HS Code, container type &
quantity, Incoterms, service type, carrier, ETD, transit time, free time, ocean
freight rate, BAF/CAF/PSS/LSS, THC origin/destination, doc fee, validity, …),
each with the real-world synonym spellings seen in tender documents. The same
dictionary is served at `GET /rfq/standard-fields`.

The response includes both the 8 classic form fields (`data`) and **every**
standard field found (`fields`), plus the detected `format` and `match_count`.
If a document yields fewer than 2 fields (e.g. a blank template), a
keyword-driven sample from the DB is returned instead (`source: "sample"`).

Add columns or synonyms by editing `standard_fields.py` and re-seeding.

## Replacing dummy data with real data

The dummy data lives entirely in `app/seed.py`. To go live you can:

1. **Edit `seed.py`** and run `python -m app.seed --reset`, or
2. **Point at a real database** — set `NORDNEURON_DATABASE_URL` to any SQLAlchemy
   URL (e.g. `postgresql+psycopg://user:pass@host/db`) and load your own rows, or
3. **Swap the simulated integrations** — `eta.py`'s telemetry endpoint and the
   RFQ parser are the only places with mock behavior; replace their bodies with
   real AIS / OpenWeatherMap / OCR calls. The response shapes stay the same, so
   the frontend needs no changes.
```bash
# Example: use Postgres instead of SQLite
export NORDNEURON_DATABASE_URL="postgresql+psycopg://nn:secret@localhost/nordneuron"
```
