from typing import Generator
import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from backend.app.core.config import settings

logger = logging.getLogger("incidentmind.database")

# Normalize Postgres connection string for SQLAlchemy 2.0 (e.g. postgres:// -> postgresql://)
db_url = settings.DATABASE_URL
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

# Determine database engine arguments based on driver
engine_kwargs = {"echo": False}
if db_url.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}
    logger.info("Initializing local SQLite database connection.")
else:
    # Supabase / PostgreSQL cloud pooling optimizations
    engine_kwargs["pool_pre_ping"] = True
    engine_kwargs["pool_size"] = 10
    engine_kwargs["max_overflow"] = 20
    engine_kwargs["pool_recycle"] = 300
    logger.info("Initializing Supabase Cloud PostgreSQL database connection.")

engine = create_engine(db_url, **engine_kwargs)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    # Auto-creates all tables in Supabase PostgreSQL or SQLite if they do not exist
    Base.metadata.create_all(bind=engine)
    logger.info("Database schemas initialized successfully.")

