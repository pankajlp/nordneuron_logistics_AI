"""Database engine and session setup.

SQLite is used by default so the suite runs with zero external services and ships
with dummy data. To move to a real database (e.g. Postgres) later, set the
``NORDNEURON_DATABASE_URL`` environment variable to a SQLAlchemy connection
string; nothing else in the code needs to change.
"""
import os
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Default: a local SQLite file living next to the backend package.
_DEFAULT_DB_PATH = Path(__file__).resolve().parent.parent / "nordneuron.db"
DATABASE_URL = os.getenv("NORDNEURON_DATABASE_URL", f"sqlite:///{_DEFAULT_DB_PATH}")

# check_same_thread is only needed for SQLite + FastAPI's threadpool.
_connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=_connect_args, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)
Base = declarative_base()


def get_db():
    """FastAPI dependency that yields a scoped database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
