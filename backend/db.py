from sqlalchemy import create_engine
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
    )
    Base.metadata.create_all(bind=engine)


def get_db():
    """Yield a database session for request-scoped dependency injection."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
