from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base

SQLALCHEMY_DATABASE_URL = "sqlite:///./medlink.db"
# Using check_same_thread=False for SQLite to allow FastAPI to handle requests efficiently
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def init_db():
    """Create all tables once at application startup. Call from main.py lifespan."""
    from models import (  # noqa: F401 – import triggers table registration
        User, MedicalHistoryRequest, RegistrationRequest, Medicine, LabTest,
        WarehouseInventory, Appointment, Order, WarehouseOrder, LabBooking,
        LabResult, MedicalRecord, AuditLog, Review, Prescription, Payment,
        Favorite, FavoriteMedicine, CartItem, PatientNote, Notification,
        FamilyLink, ServiceBooking,
    )
    Base.metadata.create_all(bind=engine)
    ensure_sqlite_columns()


def ensure_sqlite_columns():
    """SQLite create_all does not add columns to an existing local DB."""
    migrations = {
        "users": {
            "drug_allergies": "JSON",
            "working_hours": "JSON",
        },
        "medicines": {
            "strength": "VARCHAR",
            "barcode": "VARCHAR",
            "warnings": "TEXT",
        },
        "warehouse_inventory": {
            "strength": "VARCHAR",
            "barcode": "VARCHAR",
        },
    }
    with engine.begin() as conn:
        for table, columns in migrations.items():
            existing = {row[1] for row in conn.execute(text(f"PRAGMA table_info({table})"))}
            for column, ddl_type in columns.items():
                if column not in existing:
                    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {ddl_type}"))


def get_db():
    """Yield a database session for request-scoped dependency injection."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
