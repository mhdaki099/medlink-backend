import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base

_raw_db_url = os.environ.get("DATABASE_URL", "sqlite:///./medlink.db")
if _raw_db_url.startswith("postgres://"):
    _raw_db_url = _raw_db_url.replace("postgres://", "postgresql://", 1)
SQLALCHEMY_DATABASE_URL = _raw_db_url

_engine_kwargs = {}
if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    _engine_kwargs["connect_args"] = {"check_same_thread": False}

engine = create_engine(SQLALCHEMY_DATABASE_URL, **_engine_kwargs)

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
    ensure_demo_radiology_centers()
    ensure_provider_catalog()
    ensure_demo_core_users()
    ensure_demo_appointments()


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
            "status_before_change": "TEXT",
            "reason": "TEXT",
            "rejection_reason_type": "TEXT",
            "recommended_specialty": "TEXT",
            "recommended_doctor_id": "TEXT",
        },
        "medical_records": {
            "record_owner": "TEXT DEFAULT 'self'",
        },
        "prescriptions": {
            "appointment_id": "TEXT",
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
            "service_items": "JSON",
            "services_total": "FLOAT DEFAULT 0",
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


def ensure_demo_radiology_centers():
    """Create demo radiology centers on existing DBs if none exist."""
    from datetime import datetime, timezone
    from models import User
    from auth_utils import hash_password

    db = SessionLocal()
    try:
        if db.query(User).filter(User.role == "radiology").first():
            return
        now = datetime.now(timezone.utc).isoformat()
        demos = [
            {
                "id": "rad1",
                "role": "radiology",
                "name": "مركز الشام للأشعة",
                "email": "rad.sham@medlink.sy",
                "password": hash_password("123456"),
                "phone": "+963-944-778899",
                "city": "دمشق",
                "address": "شارع بغداد، المزة، دمشق",
                "open_hours": "08:00 - 20:00",
                "has_home_service": True,
                "home_service_fee": 15000,
                "is_active": True,
                "verified": True,
                "created_at": now,
            },
            {
                "id": "rad2",
                "role": "radiology",
                "name": "مركز حلب للتصوير الطبي",
                "email": "rad.aleppo@medlink.sy",
                "password": hash_password("123456"),
                "phone": "+963-955-334455",
                "city": "حلب",
                "address": "حي الفرقان، حلب",
                "open_hours": "09:00 - 18:00",
                "is_active": True,
                "verified": True,
                "created_at": now,
            },
        ]
        for row in demos:
            if db.query(User).filter(User.id == row["id"]).first():
                continue
            db.add(User(**row))
        db.commit()
    except Exception:
        db.rollback()
    finally:
        db.close()


def ensure_provider_catalog():
    """Seed lab/radiology service catalogs when a provider has no tests yet."""
    from models import LabTest, User

    lab_catalog = [
        {"id": "lt1", "lab_id": "lab1", "name": "صورة دم كاملة CBC", "category": "تحاليل الدم", "price": 3500, "duration_hours": 2,
         "description": "تحليل شامل لخلايا الدم", "preparation": "لا يشترط الصيام"},
        {"id": "lt2", "lab_id": "lab1", "name": "سكر الدم الصائم", "category": "تحاليل الدم", "price": 1800, "duration_hours": 1,
         "description": "قياس مستوى السكر في الدم", "preparation": "الصيام 8 ساعات مطلوب"},
        {"id": "lt3", "lab_id": "lab1", "name": "وظائف الكبد LFT", "category": "تحاليل الدم", "price": 6500, "duration_hours": 4,
         "description": "فحص إنزيمات الكبد", "preparation": "الصيام 8 ساعات مطلوب"},
        {"id": "lt8", "lab_id": "lab2", "name": "تحليل الهيموغلوبين السكري HbA1c", "category": "تحاليل الدم", "price": 7500, "duration_hours": 4,
         "description": "مؤشر متوسط السكر", "preparation": "لا يشترط الصيام"},
        {"id": "lt9", "lab_id": "lab2", "name": "فيروس التهاب الكبد B و C", "category": "فحوصات الفيروسات", "price": 12000, "duration_hours": 8,
         "description": "كشف فيروس التهاب الكبد", "preparation": "لا يشترط الصيام"},
    ]
    radiology_catalog = [
        {"id": "rt1", "lab_id": "rad1", "name": "أشعة سينية (X-Ray)", "category": "أشعة", "price": 25000, "duration_hours": 1,
         "description": "تصوير بالأشعة السينية", "preparation": "إزالة المعادن من منطقة الفحص"},
        {"id": "rt2", "lab_id": "rad1", "name": "أشعة مقطعية (CT Scan)", "category": "أشعة", "price": 85000, "duration_hours": 2,
         "description": "تصوير مقطعي محوسب", "preparation": "الصيام 4 ساعات إن لزم الصبغة"},
        {"id": "rt3", "lab_id": "rad1", "name": "رنين مغناطيسي (MRI)", "category": "أشعة", "price": 120000, "duration_hours": 3,
         "description": "تصوير بالرنين المغناطيسي", "preparation": "إزالة أي أجهزة معدنية"},
        {"id": "rt4", "lab_id": "rad1", "name": "موجات فوق صوتية (Ultrasound)", "category": "أشعة", "price": 35000, "duration_hours": 1,
         "description": "فحص بالموجات فوق الصوتية", "preparation": "شرب الماء قبل الفحص إن طُلب"},
        {"id": "rt5", "lab_id": "rad2", "name": "ماموجرام", "category": "أشعة", "price": 45000, "duration_hours": 1,
         "description": "فحص الثدي الشعاعي", "preparation": "لا يشترط تحضير خاص"},
        {"id": "rt6", "lab_id": "rad2", "name": "أشعة بانوراما للأسنان", "category": "أشعة", "price": 20000, "duration_hours": 1,
         "description": "تصوير بانورامي للفك والأسنان", "preparation": "إزالة المجوهرات من الفم"},
    ]

    catalogs_by_provider = {}
    for row in lab_catalog + radiology_catalog:
        catalogs_by_provider.setdefault(row["lab_id"], []).append(row)

    db = SessionLocal()
    try:
        for provider_id, rows in catalogs_by_provider.items():
            if not db.query(User).filter(User.id == provider_id).first():
                continue
            for row in rows:
                if db.query(LabTest).filter(LabTest.id == row["id"]).first():
                    continue
                db.add(LabTest(**row))
        db.commit()
    except Exception:
        db.rollback()
    finally:
        db.close()


def ensure_demo_core_users():
    """Ensure demo patient (p1) and doctor (d1) exist for booking/login on partial DBs."""
    from datetime import datetime, timezone
    from models import User
    from auth_utils import hash_password

    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc).isoformat()
        demos = [
            {
                "id": "p1",
                "role": "patient",
                "name": "أحمد محمد الخليل",
                "email": "ahmed@medlink.sy",
                "password": hash_password("123456"),
                "phone": "+963-911-123456",
                "city": "دمشق",
                "is_active": True,
                "verified": True,
                "created_at": now,
            },
            {
                "id": "d1",
                "role": "doctor",
                "name": "د. كريم نصر الله",
                "email": "dr.karim@medlink.sy",
                "password": hash_password("123456"),
                "phone": "+963-912-111222",
                "city": "دمشق",
                "specialization": "قلبية",
                "specialization_en": "Cardiology",
                "price_per_session": 95000,
                "available_hours": "10:00 - 18:00",
                "is_active": True,
                "verified": True,
                "created_at": now,
            },
        ]
        for row in demos:
            if db.query(User).filter(User.id == row["id"]).first():
                continue
            if db.query(User).filter(User.email == row["email"]).first():
                continue
            db.add(User(**row))
        db.commit()
    except Exception:
        db.rollback()
    finally:
        db.close()


def ensure_demo_appointments():
    """Ensure at least one demo appointment exists (Render DB resets / seed skip)."""
    from datetime import date, timedelta, datetime, timezone
    from models import Appointment, User

    db = SessionLocal()
    try:
        patient = db.query(User).filter(User.id == "p1").first()
        if not patient:
            patient = (
                db.query(User)
                .filter(User.role == "patient", User.is_active == True)
                .order_by(User.created_at.asc())
                .first()
            )
        doctor = db.query(User).filter(User.id == "d1").first()
        if not doctor:
            doctor = (
                db.query(User)
                .filter(User.role == "doctor", User.is_active == True)
                .order_by(User.created_at.asc())
                .first()
            )
        if not patient or not doctor:
            return

        now = datetime.now(timezone.utc).isoformat()
        tomorrow = (date.today() + timedelta(days=1)).isoformat()
        day_after = (date.today() + timedelta(days=2)).isoformat()

        demos = [
            {
                "id": "apt1",
                "patient_id": patient.id,
                "doctor_id": doctor.id,
                "date": tomorrow,
                "time": "10:00",
                "status": "pending",
                "notes": "موعد تجريبي — بانتظار تأكيد الطبيب",
                "price": 25000,
                "record_access_granted": False,
                "created_at": now,
            },
            {
                "id": "apt2",
                "patient_id": patient.id,
                "doctor_id": doctor.id,
                "date": day_after,
                "time": "11:00",
                "status": "confirmed",
                "notes": "موعد مؤكد تجريبي",
                "price": 25000,
                "record_access_granted": True,
                "created_at": now,
            },
        ]
        for row in demos:
            existing = db.query(Appointment).filter(Appointment.id == row["id"]).first()
            if existing:
                # Reset demo appointments stuck in pending workflow states
                if existing.status in (
                    "cancellation_requested",
                    "schedule_change_pending",
                    "reschedule_requested",
                ):
                    existing.status = row["status"]
                    existing.date = row["date"]
                    existing.time = row["time"]
                    existing.cancel_requested = False
                    existing.reschedule_requested = False
                    existing.requested_date = None
                    existing.requested_time = None
                    existing.status_before_change = None
                    existing.rejection_note = None
                continue
            db.add(Appointment(**row))
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
