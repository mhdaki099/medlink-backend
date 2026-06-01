from fastapi import APIRouter, Query, HTTPException, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime, timedelta, timezone
import uuid
from db import get_db
from models import User, Appointment, Review, Favorite, PatientNote, Prescription, MedicalRecord, Notification
from auth_utils import get_current_user, require_role, hash_password
from utils.helpers import model_to_dict, safe_update

router = APIRouter()

SPECIALIZATIONS = [
    {"id": "sp1",  "name": "قلبية",                    "name_en": "Cardiology",              "icon": "heart"},
    {"id": "sp2",  "name": "طب الأطفال",               "name_en": "Pediatrics",              "icon": "baby-face"},
    {"id": "sp3",  "name": "هضمية",                    "name_en": "Gastroenterology",        "icon": "stomach"},
    {"id": "sp4",  "name": "الجهاز التنفسي",           "name_en": "Pulmonology",             "icon": "lungs"},
    {"id": "sp5",  "name": "جلدية وتجميل",             "name_en": "Dermatology",             "icon": "flower-outline"},
    {"id": "sp6",  "name": "عظام ومفاصل",              "name_en": "Orthopedics",             "icon": "bone"},
    {"id": "sp7",  "name": "طب العيون",                "name_en": "Ophthalmology",           "icon": "eye"},
    {"id": "sp8",  "name": "بلعوم",                    "name_en": "ENT",                     "icon": "ear-hearing"},
    {"id": "sp9",  "name": "طب الأسنان",               "name_en": "Dentistry",               "icon": "tooth"},
    {"id": "sp10", "name": "طب الأعصاب",               "name_en": "Neurology",               "icon": "brain"},
    {"id": "sp11", "name": "طب الباطنة",               "name_en": "Internal Medicine",       "icon": "stethoscope"},
    {"id": "sp12", "name": "طب الطوارئ",               "name_en": "Emergency Medicine",      "icon": "ambulance"},
    {"id": "sp13", "name": "طب الأورام",               "name_en": "Oncology",                "icon": "ribbon"},
    {"id": "sp14", "name": "طب النساء والتوليد",       "name_en": "Obstetrics & Gynecology", "icon": "human-female"},
    {"id": "sp15", "name": "طب المسالك البولية",       "name_en": "Urology",                 "icon": "water"},
    {"id": "sp16", "name": "طب الغدد الصماء",          "name_en": "Endocrinology",           "icon": "flask"},
    {"id": "sp17", "name": "طب الروماتيزم",            "name_en": "Rheumatology",            "icon": "hand-back-right"},
    {"id": "sp18", "name": "طب الكلى",                 "name_en": "Nephrology",              "icon": "kidney"},
    {"id": "sp19", "name": "طب الأمراض المعدية",       "name_en": "Infectious Diseases",     "icon": "virus"},
    {"id": "sp20", "name": "جراحة عامة",               "name_en": "General Surgery",         "icon": "scalpel"},
    {"id": "sp21", "name": "جراحة العظام",             "name_en": "Orthopedic Surgery",      "icon": "bone"},
    {"id": "sp22", "name": "جراحة القلب",              "name_en": "Cardiac Surgery",         "icon": "heart-pulse"},
    {"id": "sp23", "name": "جراحة الأعصاب",            "name_en": "Neurosurgery",            "icon": "brain"},
    {"id": "sp24", "name": "جراحة التجميل",            "name_en": "Plastic Surgery",         "icon": "star-face"},
    {"id": "sp25", "name": "طب الأسرة",                "name_en": "Family Medicine",         "icon": "home-heart"},
    {"id": "sp26", "name": "طب الشيخوخة",              "name_en": "Geriatrics",              "icon": "human-cane"},
    {"id": "sp27", "name": "طب الأمراض النفسية",       "name_en": "Psychiatry",              "icon": "head-cog"},
    {"id": "sp28", "name": "طب الصدر",                 "name_en": "Chest Medicine",          "icon": "lungs"},
    {"id": "sp29", "name": "طب الدم",                  "name_en": "Hematology",              "icon": "blood-bag"},
    {"id": "sp30", "name": "طب الأمراض الجلدية",       "name_en": "Dermatology",             "icon": "flower"},
]

# Arabic → English mapping for backfill and registration
SPEC_AR_TO_EN = {s["name"]: s["name_en"] for s in SPECIALIZATIONS}

class ReviewRequest(BaseModel):
    patient_id: str
    rating: float
    comment: str = ""

@router.get("")
def list_doctors(specialization: str = Query(None), province: str = Query(None), district: str = Query(None), db: Session = Depends(get_db)):
    query = db.query(User).filter(User.role == "doctor", User.is_active == True)
    if specialization and specialization.lower() not in ("all", "الكل", ""):
        query = query.filter(
            (User.specialization.ilike(f"%{specialization}%")) |
            (User.specialization_en.ilike(f"%{specialization}%"))
        )
    if province:
        query = query.filter(User.province.ilike(f"%{province}%"))
    if district:
        query = query.filter(User.district.ilike(f"%{district}%"))
    return [model_to_dict(d, ["password"]) for d in query.all()]

@router.get("/specializations")
def get_specializations():
    return SPECIALIZATIONS

@router.get("/my-doctors")
def get_my_doctors(patient_id: str = Query(...), current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user["role"] == "patient" and current_user["sub"] != patient_id:
        raise HTTPException(403, "ليس لديك صلاحية")
    doctor_ids = {d[0] for d in db.query(Appointment.doctor_id).filter(Appointment.patient_id == patient_id).distinct().all()}
    doctor_ids.update(d[0] for d in db.query(Prescription.doctor_id).filter(Prescription.patient_id == patient_id).distinct().all())
    if not doctor_ids:
        return []
    doctors = db.query(User).filter(User.id.in_(list(doctor_ids)), User.role == "doctor").all()
    results = []
    for doc in doctors:
        d = model_to_dict(doc, ["password"])
        d["appointment_count"] = db.query(Appointment).filter(Appointment.patient_id == patient_id, Appointment.doctor_id == doc.id).count()
        last_apt = db.query(Appointment).filter(Appointment.patient_id == patient_id, Appointment.doctor_id == doc.id).order_by(Appointment.created_at.desc()).first()
        d["last_visit"] = last_apt.date if last_apt else None
        d["last_appointment_date"] = last_apt.date if last_apt else None
        d["provided_prescriptions"] = db.query(Prescription).filter(Prescription.patient_id == patient_id, Prescription.doctor_id == doc.id).count()
        results.append(d)
    return results

@router.get("/secretaries")
def get_secretaries(doctor_id: str, current_user: dict = Depends(require_role("doctor", "admin")), db: Session = Depends(get_db)):
    if current_user["role"] == "doctor" and current_user["sub"] != doctor_id:
        raise HTTPException(403, "ليس لديك صلاحية")
    return [model_to_dict(s, ["password"]) for s in db.query(User).filter(User.role == 'secretary', User.supervisor_id == doctor_id).all()]

@router.post("/secretary")
def add_secretary(doctor_id: str, data: dict, current_user: dict = Depends(require_role("doctor", "admin")), db: Session = Depends(get_db)):
    if current_user["role"] == "doctor" and current_user["sub"] != doctor_id:
        raise HTTPException(403, "ليس لديك صلاحية")
    raw_pwd = data.get("password", "123456")
    new_sec = User(
        id=f"sec_{uuid.uuid4().hex[:8]}", role="secretary", supervisor_id=doctor_id,
        name=data.get("name"), email=data.get("email"),
        password=hash_password(raw_pwd),  # FIX: was storing plaintext
        phone=data.get("phone"), created_at=datetime.now(timezone.utc).isoformat()
    )
    db.add(new_sec); db.commit()
    return model_to_dict(new_sec, ["password"])

@router.post("/notes")
def add_patient_note(doctor_id: str, patient_id: str, note_text: str, current_user: dict = Depends(require_role("doctor", "secretary", "admin")), db: Session = Depends(get_db)):
    if current_user["role"] == "doctor" and current_user["sub"] != doctor_id:
        raise HTTPException(403, "ليس لديك صلاحية")
    if current_user["role"] == "secretary" and not db.query(User).filter(User.id == current_user["sub"], User.supervisor_id == doctor_id).first():
        raise HTTPException(403, "ليس لديك صلاحية")
    n = PatientNote(id=f"not_{uuid.uuid4().hex[:8]}", doctor_id=doctor_id, patient_id=patient_id, note_text=note_text, created_at=datetime.now(timezone.utc).isoformat())
    db.add(n); db.commit(); db.refresh(n)
    return model_to_dict(n)

@router.get("/notes/{patient_id}")
def get_patient_notes(patient_id: str, doctor_id: str, current_user: dict = Depends(require_role("doctor", "secretary", "admin")), db: Session = Depends(get_db)):
    return [model_to_dict(n) for n in db.query(PatientNote).filter(PatientNote.patient_id == patient_id, PatientNote.doctor_id == doctor_id).order_by(PatientNote.created_at.desc()).all()]

@router.get("/favorites/{patient_id}")
def get_favorites(patient_id: str, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    target_ids = [f.target_id for f in db.query(Favorite).filter(Favorite.user_id == patient_id).all()]
    return [model_to_dict(d, ["password"]) for d in db.query(User).filter(User.id.in_(target_ids)).all()]

@router.get("/{doctor_id}")
def get_doctor(doctor_id: str, patient_id: str = Query(None), db: Session = Depends(get_db)):
    d = db.query(User).filter(User.id == doctor_id, User.role == "doctor").first()
    if not d:
        raise HTTPException(404, "الطبيب غير موجود")
    d_dict = model_to_dict(d, ["password"])
    d_dict["upcoming_count"] = db.query(Appointment).filter(Appointment.doctor_id == doctor_id, Appointment.status.in_(["confirmed", "pending"])).count()
    d_dict["is_favorite"] = bool(db.query(Favorite).filter(Favorite.user_id == patient_id, Favorite.target_id == doctor_id).first()) if patient_id else False
    week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    month_ago = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    d_dict["favorites_count"] = db.query(Favorite).filter(Favorite.target_id == doctor_id).count()
    d_dict["weekly_bookings"] = db.query(Appointment).filter(Appointment.doctor_id == doctor_id, Appointment.created_at >= week_ago).count()
    d_dict["monthly_bookings"] = db.query(Appointment).filter(Appointment.doctor_id == doctor_id, Appointment.created_at >= month_ago).count()
    return d_dict

@router.post("/{doctor_id}/favorite")
def toggle_favorite(doctor_id: str, patient_id: str, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    fav = db.query(Favorite).filter(Favorite.user_id == patient_id, Favorite.target_id == doctor_id).first()
    if fav:
        db.delete(fav); db.commit(); return {"is_favorite": False}
    db.add(Favorite(id=f"fav_{uuid.uuid4().hex[:8]}", user_id=patient_id, target_id=doctor_id, created_at=datetime.now(timezone.utc).isoformat()))
    db.commit(); return {"is_favorite": True}

@router.get("/{doctor_id}/availability")
def get_availability(doctor_id: str, date: str = Query(None), db: Session = Depends(get_db)):
    d = db.query(User).filter(User.id == doctor_id, User.role == "doctor").first()
    if not d:
        raise HTTPException(404, "الطبيب غير موجود")
    active_statuses = ["confirmed", "pending", "reschedule_requested", "cancellation_requested", "patient_confirmation_pending"]
    booked = db.query(Appointment).filter(Appointment.doctor_id == doctor_id, Appointment.status.in_(active_statuses)).all()
    hours = d.available_hours or ""
    generated_slots = []
    wh = d.working_hours or {}
    if isinstance(wh, dict) and wh.get("slots"):
        generated_slots = wh.get("slots", [])
    elif isinstance(wh, dict) and (wh.get("morning") or wh.get("evening")):
        generated_slots = _generate_slots_from_working_hours(d, wh)
    elif hours:
        generated_slots = [h.strip() for h in hours.replace("،", ",").split(",") if h.strip()]
    off_days = wh.get("off_days", []) if isinstance(wh, dict) else []
    target_date = date
    day_off = False
    if target_date:
        try:
            from datetime import datetime as dt
            weekday = dt.fromisoformat(target_date).weekday()
            day_names = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
            day_off = day_names[weekday] in [str(x).lower() for x in off_days]
        except Exception:
            pass
    return {
        "available_days": d.available_days or [],
        "available_hours": hours,
        "working_hours": wh,
        "time_slots": [] if day_off else generated_slots,
        "booked_slots": [{"date": a.date, "time": a.time} for a in booked],
        "day_off": day_off,
    }


def _generate_slots_from_working_hours(doctor: User, wh: dict) -> list:
    """Generate time slots from morning/evening sessions, consultation duration and buffer."""
    duration = doctor.consultation_duration or wh.get("consultation_duration") or 30
    buffer = doctor.buffer_minutes or wh.get("buffer_minutes") or 10
    slots = []

    def parse_range(range_str: str):
        if not range_str or "-" not in range_str:
            return None, None
        parts = range_str.replace(" ", "").split("-")
        return parts[0], parts[1]

    def to_minutes(t: str):
        t = t.upper().replace(" ", "")
        if "AM" in t or "PM" in t:
            from datetime import datetime as dt
            return dt.strptime(t, "%I:%M%p").hour * 60 + dt.strptime(t, "%I:%M%p").minute
        h, m = t.split(":")
        return int(h) * 60 + int(m)

    def from_minutes(mins: int):
        from datetime import datetime as dt
        h = mins // 60
        m = mins % 60
        return dt.strptime(f"{h}:{m:02d}", "%H:%M").strftime("%I:%M %p")

    for session in [wh.get("morning", ""), wh.get("evening", "")]:
        start, end = parse_range(session)
        if not start or not end:
            continue
        cur = to_minutes(start)
        end_m = to_minutes(end)
        while cur + duration <= end_m:
            slots.append(from_minutes(cur))
            cur += duration + buffer
    return slots

@router.post("/{doctor_id}/reviews")
def add_review(doctor_id: str, req: ReviewRequest, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    doc = db.query(User).filter(User.id == doctor_id, User.role == "doctor").first()
    if not doc:
        raise HTTPException(404, "الطبيب غير موجود")
    # FIX: Add the review, flush, then compute average from ALL reviews (avoids double-count)
    new_review = Review(id=f"rev_{uuid.uuid4().hex[:8]}", patient_id=req.patient_id, target_id=doctor_id, rating=req.rating, comment=req.comment, created_at=datetime.now(timezone.utc).isoformat())
    db.add(new_review)
    db.flush()
    all_reviews = db.query(Review).filter(Review.target_id == doctor_id).all()
    doc.rating = round(sum(r.rating for r in all_reviews) / len(all_reviews), 1)
    doc.total_reviews = len(all_reviews)
    db.commit()
    return {"message": "تمت إضافة التقييم", "new_rating": doc.rating, "total_reviews": doc.total_reviews}

@router.put("/{doctor_id}/profile")
def update_doctor_profile(doctor_id: str, updates: dict, current_user: dict = Depends(require_role("doctor", "admin")), db: Session = Depends(get_db)):
    if current_user["role"] == "doctor" and current_user["sub"] != doctor_id:
        raise HTTPException(403, "ليس لديك صلاحية")
    doc = db.query(User).filter(User.id == doctor_id).first()
    if not doc:
        raise HTTPException(404, "الطبيب غير موجود")
    # Auto-populate specialization_en when specialization changes
    if "specialization" in updates and updates["specialization"]:
        updates["specialization_en"] = SPEC_AR_TO_EN.get(updates["specialization"], updates.get("specialization_en", ""))
    safe_update(doc, updates)
    db.commit()
    return model_to_dict(doc, ["password"])

@router.get("/{doctor_id}/analytics")
def get_doctor_analytics(doctor_id: str, current_user: dict = Depends(require_role("doctor", "admin")), db: Session = Depends(get_db)):
    if current_user["role"] == "doctor" and current_user["sub"] != doctor_id:
        raise HTTPException(403, "ليس لديك صلاحية")
    fav_count = db.query(Favorite).filter(Favorite.target_id == doctor_id).count()
    total_apts = db.query(Appointment).filter(Appointment.doctor_id == doctor_id).count()
    week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    month_ago = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    weekly = db.query(Appointment).filter(Appointment.doctor_id == doctor_id, Appointment.created_at >= week_ago).count()
    monthly = db.query(Appointment).filter(Appointment.doctor_id == doctor_id, Appointment.created_at >= month_ago).count()
    completed = db.query(Appointment).filter(Appointment.doctor_id == doctor_id, Appointment.status == "completed", Appointment.created_at >= month_ago).all()
    revenue = sum(a.price or 0 for a in completed)
    patients = db.query(Appointment.patient_id).filter(Appointment.doctor_id == doctor_id).distinct().count()
    doc = db.query(User).filter(User.id == doctor_id).first()
    return {
        "favorites_count": fav_count,
        "total_appointments": total_apts,
        "weekly_bookings": weekly,
        "monthly_bookings": monthly,
        "unique_patients": patients,
        "active_patients": patients,
        "overall_rating": doc.rating or 0 if doc else 0,
        "total_reviews": doc.total_reviews or 0 if doc else 0,
        "monthly_appointments": [0] * 12,
        "revenue_summary": {"this_month": revenue, "last_month": 0, "growth": 0},
    }

@router.post("/prescription")
def add_prescription(doctor_id: str, patient_id: str, data: dict, current_user: dict = Depends(require_role("doctor", "admin")), db: Session = Depends(get_db)):
    if current_user["role"] == "doctor" and current_user["sub"] != doctor_id:
        raise HTTPException(403, "ليس لديك صلاحية")
    doctor = db.query(User).filter(User.id == doctor_id).first()
    patient = db.query(User).filter(User.id == patient_id).first()
    now = datetime.now(timezone.utc)
    medications = data.get("medications", [])
    allergies = [str(a).lower() for a in (patient.drug_allergies or [])] if patient else []
    warnings = []
    for med in medications:
        name = str(med.get("name", "")).lower()
        ingredient = str(med.get("active_ingredient", med.get("active_ingredients", ""))).lower()
        if allergies and any(a and (a in name or a in ingredient) for a in allergies):
            warnings.append(f"تحذير حساسية دوائية: {med.get('name', '')}")
    import random, string
    code = "RX-" + "".join(random.choices(string.digits, k=8))
    fulfillment = [{"index": i, "name": m.get("name", ""), "dosage": m.get("dosage", ""), "frequency": m.get("frequency", ""), "duration": m.get("duration", ""), "status": "pending"} for i, m in enumerate(medications)]
    pres = Prescription(id=f"pre_{uuid.uuid4().hex[:8]}", doctor_id=doctor_id, patient_id=patient_id, prescription_code=code, medications=medications, fulfillment_items=fulfillment, notes=data.get("notes", ""), status="pending", created_at=now.isoformat())
    db.add(pres)
    db.add(MedicalRecord(id=f"rec_{uuid.uuid4().hex[:8]}", patient_id=patient_id, uploaded_by=doctor.name if doctor else "Doctor", type="prescription", title=f"وصفة طبية - د. {doctor.name if doctor else ''}", content=str(medications), date=now.strftime("%Y-%m-%d"), created_at=now.isoformat()))
    db.add(Notification(id=f"ntf_{uuid.uuid4().hex[:8]}", user_id=patient_id, title="وصفة طبية جديدة", message=f"أضاف الدكتور {doctor.name if doctor else ''} وصفة طبية. رمز الوصفة: {code}", type="prescription", created_at=now.isoformat()))
    db.commit()
    result = model_to_dict(pres)
    result["warnings"] = warnings
    return result
