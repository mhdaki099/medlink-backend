"""
Idempotent migration runner.
Run: python migrate.py
Applies all pending column additions to the existing SQLite database.
"""
from sqlalchemy import create_engine, text

SQLALCHEMY_DATABASE_URL = "sqlite:///./medlink.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})

MIGRATIONS = {
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
        "supervisor_id": "TEXT",
        "patient_unique_id": "TEXT",
        "qr_code_url": "TEXT",
        "specialization_en": "TEXT",
        "association_no": "TEXT",
        "documents": "JSON",
        "is_provisional": "BOOLEAN DEFAULT 0",
        "lat": "FLOAT",
        "lng": "FLOAT",
        "open_hours": "TEXT",
        "license_no": "TEXT",
        "is_featured": "BOOLEAN DEFAULT 0",
        "blood_type": "TEXT",
        "allergies": "JSON",
        "chronic_conditions": "JSON",
        "dob": "TEXT",
        "gender": "TEXT",
        "name_en": "TEXT",
        "total_sessions": "INTEGER",
        "total_reviews": "INTEGER",
        "rating": "FLOAT",
        "education": "JSON",
        "languages": "JSON",
        "available_days": "JSON",
        "available_hours": "TEXT",
        "clinic_name": "TEXT",
        "clinic_address": "TEXT",
        "price_per_session": "FLOAT",
        "experience_years": "INTEGER",
        "specialization": "TEXT",
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
        "old_price": "FLOAT",
        "category": "TEXT",
        "requires_prescription": "BOOLEAN DEFAULT 0",
        "alternatives": "JSON",
    },
    "warehouse_inventory": {
        "strength": "VARCHAR",
        "barcode": "VARCHAR",
        "category": "TEXT",
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
        "shared_with": "JSON",
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
    "audit_logs": {
        "details_json": "JSON",
    },
    "family_links": {
        "linked_patient_id": "TEXT",
    },
}

# New tables to create if they don't exist
NEW_TABLES = {
    "consultation_reports": """
        CREATE TABLE IF NOT EXISTS consultation_reports (
            id TEXT PRIMARY KEY,
            appointment_id TEXT NOT NULL,
            doctor_id TEXT NOT NULL,
            patient_id TEXT NOT NULL,
            condition_summary TEXT,
            is_healthy BOOLEAN DEFAULT 0,
            notes TEXT,
            follow_up TEXT,
            created_at TEXT,
            FOREIGN KEY (appointment_id) REFERENCES appointments(id),
            FOREIGN KEY (doctor_id) REFERENCES users(id),
            FOREIGN KEY (patient_id) REFERENCES users(id)
        )
    """,
    "service_requests": """
        CREATE TABLE IF NOT EXISTS service_requests (
            id TEXT PRIMARY KEY,
            consultation_report_id TEXT,
            doctor_id TEXT NOT NULL,
            patient_id TEXT NOT NULL,
            request_type TEXT NOT NULL,
            service_name TEXT,
            reference_code TEXT UNIQUE,
            notes TEXT,
            status TEXT DEFAULT 'pending',
            created_at TEXT,
            FOREIGN KEY (doctor_id) REFERENCES users(id),
            FOREIGN KEY (patient_id) REFERENCES users(id)
        )
    """,
}


def run_migrations():
    with engine.begin() as conn:
        # Apply column additions
        for table, columns in MIGRATIONS.items():
            try:
                existing = {row[1] for row in conn.execute(text(f"PRAGMA table_info({table})"))}
            except Exception:
                print(f"  [SKIP] Table {table} does not exist yet")
                continue
            for column, ddl_type in columns.items():
                if column not in existing:
                    try:
                        conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {ddl_type}"))
                        print(f"  [ADD] {table}.{column}")
                    except Exception as e:
                        print(f"  [ERR] {table}.{column}: {e}")

        # Create new tables
        for table_name, ddl in NEW_TABLES.items():
            try:
                conn.execute(text(ddl))
                print(f"  [TABLE] {table_name} ensured")
            except Exception as e:
                print(f"  [ERR] Creating {table_name}: {e}")

        # Backfill patient_unique_id for existing patients
        try:
            import uuid as _uuid
            from datetime import datetime as _dt, timezone as _tz
            rows = conn.execute(text("SELECT id FROM users WHERE role='patient' AND (patient_unique_id IS NULL OR patient_unique_id='')")).fetchall()
            for row in rows:
                uid = f"PT-{_dt.now(_tz.utc).strftime('%Y%m%d')}{_uuid.uuid4().hex[:6].upper()}"
                conn.execute(text("UPDATE users SET patient_unique_id=:uid WHERE id=:id"), {"uid": uid, "id": row[0]})
            if rows:
                print(f"  [BACKFILL] patient_unique_id for {len(rows)} patients")
        except Exception as e:
            print(f"  [ERR] Backfill patient_unique_id: {e}")

        # Backfill specialization_en for existing doctors
        SPEC_MAP = {
            "قلبية": "Cardiology",
            "طب الأطفال": "Pediatrics",
            "هضمية": "Gastroenterology",
            "الجهاز التنفسي": "Pulmonology",
            "جلدية وتجميل": "Dermatology",
            "عظام ومفاصل": "Orthopedics",
            "طب العيون": "Ophthalmology",
            "بلعوم": "ENT",
            "طب الأسنان": "Dentistry",
            "طب الأعصاب": "Neurology",
            "طب الطوارئ": "Emergency Medicine",
            "طب الأورام": "Oncology",
            "طب الباطنة": "Internal Medicine",
            "طب النساء والتوليد": "Obstetrics & Gynecology",
            "طب المسالك البولية": "Urology",
            "طب الغدد الصماء": "Endocrinology",
            "طب الروماتيزم": "Rheumatology",
            "طب الكلى": "Nephrology",
            "طب الأمراض المعدية": "Infectious Diseases",
            "طب الصدر": "Pulmonology",
            "طب الجهاز العصبي": "Neurology",
            "جراحة عامة": "General Surgery",
            "جراحة العظام": "Orthopedic Surgery",
            "جراحة القلب": "Cardiac Surgery",
            "جراحة الأعصاب": "Neurosurgery",
            "جراحة التجميل": "Plastic Surgery",
            "طب الأسرة": "Family Medicine",
            "طب الشيخوخة": "Geriatrics",
            "طب الأمراض النفسية": "Psychiatry",
        }
        try:
            rows = conn.execute(text("SELECT id, specialization FROM users WHERE role='doctor' AND (specialization_en IS NULL OR specialization_en='')")).fetchall()
            for row in rows:
                spec_ar = row[1] or ""
                spec_en = SPEC_MAP.get(spec_ar, "")
                if spec_en:
                    conn.execute(text("UPDATE users SET specialization_en=:en WHERE id=:id"), {"en": spec_en, "id": row[0]})
            if rows:
                print(f"  [BACKFILL] specialization_en for {len(rows)} doctors")
        except Exception as e:
            print(f"  [ERR] Backfill specialization_en: {e}")

    print("[DONE] All migrations applied.")


if __name__ == "__main__":
    run_migrations()
