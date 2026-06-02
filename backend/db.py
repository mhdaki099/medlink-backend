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
        FamilyLink, ServiceBooking, DrugCatalog, AppointmentAuditLog,
        ConsultationReport, ServiceRequest,
    )
    Base.metadata.create_all(bind=engine)
    ensure_sqlite_columns()
    ensure_demo_secretary()


def ensure_sqlite_columns():
    """SQLite create_all does not add columns to an existing local DB."""
    migrations = {
        "users": {
            "drug_allergies": "JSON",
            "working_hours": "JSON",
            "home_service_fee": "FLOAT DEFAULT 0",
            "has_home_service": "BOOLEAN DEFAULT 0",
            "address": "TEXT",
            "province": "TEXT",
            "district": "TEXT",
            "area": "TEXT",
            "consultation_duration": "INTEGER DEFAULT 30",
            "buffer_minutes": "INTEGER DEFAULT 10",
            "facility_gallery": "JSON",
            "emergency_contact": "JSON",
            "services": "JSON",
            "patient_unique_id": "TEXT",
            "qr_code_url": "TEXT",
            "specialization_en": "TEXT",
            "association_no": "TEXT",
            "documents": "JSON",
            "is_provisional": "BOOLEAN DEFAULT 0",
        },
        "medicines": {
            "strength": "VARCHAR",
            "barcode": "VARCHAR",
            "warnings": "TEXT",
            "contraindications": "TEXT",
            "active_ingredients": "TEXT",
            "usage_info": "TEXT",
            "side_effects": "TEXT",
            "dosage": "VARCHAR",
        },
        "warehouse_inventory": {
            "strength": "VARCHAR",
            "barcode": "VARCHAR",
        },
        "appointments": {
            "rejection_note": "TEXT",
            "reschedule_requested": "BOOLEAN DEFAULT 0",
            "cancel_requested": "BOOLEAN DEFAULT 0",
            "requested_date": "TEXT",
            "requested_time": "TEXT",
            "reason": "TEXT",
            "rejection_reason_type": "TEXT",
            "recommended_specialty": "TEXT",
            "recommended_doctor_id": "TEXT",
        },
        "medical_records": {
            "record_owner": "TEXT DEFAULT 'self'",
        },
        "prescriptions": {
            "prescription_code": "TEXT",
            "status": "TEXT DEFAULT 'pending'",
            "pharmacy_id": "TEXT",
            "fulfillment_items": "JSON",
            "closed_at": "TEXT",
            "is_dispensed": "BOOLEAN DEFAULT 0",
        },
        "service_bookings": {
            "rejection_note": "TEXT",
            "rejection_reason_type": "TEXT",
            "recommended_provider_id": "TEXT",
            "reason": "TEXT",
        },
        "lab_bookings": {
            "rejection_note": "TEXT",
            "reason": "TEXT",
        },
    }
    with engine.begin() as conn:
        for table, columns in migrations.items():
            try:
                existing = {row[1] for row in conn.execute(text(f"PRAGMA table_info({table})"))}
            except Exception:
                continue
            for column, ddl_type in columns.items():
                if column not in existing:
                    try:
                        conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {ddl_type}"))
                    except Exception:
                        pass


def ensure_demo_secretary():
    """Create demo secretary on existing DBs (Render/local) if missing."""
    from datetime import datetime, timezone
    from models import User
    from auth_utils import hash_password

    db = SessionLocal()
    try:
        if db.query(User).filter(User.email == "sec.amal@medlink.sy").first():
            return
        db.add(
            User(
                id="sec_amal",
                role="secretary",
                name="أمل السكرتيرة",
                email="sec.amal@medlink.sy",
                password=hash_password("123456"),
                phone="+963-933-445566",
                city="دمشق",
                supervisor_id="d1",
                is_active=True,
                verified=True,
                created_at=datetime.now(timezone.utc).isoformat(),
            )
        )
        db.commit()
    except Exception:
        db.rollback()
    finally:
        db.close()


def get_db():
    """Yield a database session for request-scoped dependency injection."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
