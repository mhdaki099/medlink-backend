from fastapi import APIRouter, Query, HTTPException, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime
import uuid
from db import get_db
from models import User, Appointment, Review, Favorite, PatientNote, Prescription, MedicalRecord, Notification

router = APIRouter()

SPECIALIZATIONS = [
    {"id": "sp1", "name": "قلبية", "name_en": "Cardiology", "icon": "heart"},
    {"id": "sp2", "name": "طب الأطفال", "name_en": "Pediatrics", "icon": "baby-face"},
    {"id": "sp3", "name": "هضمية", "name_en": "Gastroenterology", "icon": "stomach"},
    {"id": "sp4", "name": "الجهاز التنفسي", "name_en": "Pulmonology", "icon": "lungs"},
    {"id": "sp5", "name": "جلدية وتجميل", "name_en": "Dermatology", "icon": "flower-outline"},
    {"id": "sp6", "name": "عظام ومفاصل", "name_en": "Orthopedics", "icon": "bone"},
    {"id": "sp7", "name": "طب العيون", "name_en": "Ophthalmology", "icon": "eye"},
    {"id": "sp8", "name": "بلعوم", "name_en": "ENT", "icon": "ear-hearing"},
    {"id": "sp9", "name": "طب الأسنان", "name_en": "Dentistry", "icon": "tooth"},
    {"id": "sp10", "name": "طب الأعصاب", "name_en": "Neurology", "icon": "brain"},
]

def model_to_dict(model, exclude=None):
    if not model:
        return None
    exclude = exclude or []
    return {c.name: getattr(model, c.name) for c in model.__table__.columns if c.name not in exclude}

class ReviewRequest(BaseModel):
    patient_id: str
    rating: float
    comment: str = ""

@router.get("")
def list_doctors(specialization: str = Query(None), db: Session = Depends(get_db)):
    query = db.query(User).filter(User.role == "doctor")
    if specialization:
        query = query.filter(
            (User.specialization.ilike(f"%{specialization}%")) |
            (User.specialization_en.ilike(f"%{specialization}%"))
        )
    doctors = query.all()
    return [model_to_dict(d, ["password"]) for d in doctors]

@router.get("/specializations")
def get_specializations():
    return SPECIALIZATIONS

@router.get("/secretaries")
def get_secretaries(doctor_id: str, db: Session = Depends(get_db)):
    secs = db.query(User).filter(User.role == 'secretary', User.supervisor_id == doctor_id).all()
    return [model_to_dict(s, ["password"]) for s in secs]

@router.post("/secretary")
def add_secretary(doctor_id: str, data: dict, db: Session = Depends(get_db)):
    new_sec = User(
        id=f"sec_{str(uuid.uuid4().hex)[:8]}",
        role="secretary",
        supervisor_id=doctor_id,
        name=data.get("name"),
        email=data.get("email"),
        password=data.get("password"), 
        phone=data.get("phone"),
        created_at=datetime.utcnow().isoformat()
    )
    db.add(new_sec)
    db.commit()
    return model_to_dict(new_sec, ["password"])

@router.post("/notes")
def add_patient_note(doctor_id: str, patient_id: str, note_text: str, db: Session = Depends(get_db)):
    new_note = PatientNote(
        id=f"not_{str(uuid.uuid4().hex)[:8]}",
        doctor_id=doctor_id,
        patient_id=patient_id,
        note_text=note_text,
        created_at=datetime.utcnow().isoformat()
    )
    db.add(new_note)
    db.commit()
    db.refresh(new_note)
    return model_to_dict(new_note)

@router.get("/notes/{patient_id}")
def get_patient_notes(patient_id: str, doctor_id: str, db: Session = Depends(get_db)):
    notes = db.query(PatientNote).filter(
        PatientNote.patient_id == patient_id,
        PatientNote.doctor_id == doctor_id
    ).order_by(PatientNote.created_at.desc()).all()
    return [model_to_dict(n) for n in notes]

@router.get("/{doctor_id}")
def get_doctor(doctor_id: str, patient_id: str = Query(None), db: Session = Depends(get_db)):
    d = db.query(User).filter(User.id == doctor_id, User.role == "doctor").first()
    if not d:
        raise HTTPException(404, "الطبيب غير موجود")
    
    d_dict = model_to_dict(d, ["password"])
    
    apts_count = db.query(Appointment).filter(
        Appointment.doctor_id == doctor_id,
        Appointment.status.in_(["confirmed", "pending"])
    ).count()

    is_fav = False
    if patient_id:
        fav = db.query(Favorite).filter(Favorite.user_id == patient_id, Favorite.target_id == doctor_id).first()
        is_fav = True if fav else False
    
    if d_dict:
        d_dict["upcoming_count"] = apts_count
        d_dict["is_favorite"] = is_fav
    return d_dict

@router.post("/{doctor_id}/favorite")
def toggle_favorite(doctor_id: str, patient_id: str, db: Session = Depends(get_db)):
    # Check if exists
    fav = db.query(Favorite).filter(Favorite.user_id == patient_id, Favorite.target_id == doctor_id).first()
    if fav:
        db.delete(fav)
        db.commit()
        return {"is_favorite": False}
    else:
        new_fav = Favorite(
            id=f"fav_{str(uuid.uuid4().hex)[:8]}",
            user_id=patient_id,
            target_id=doctor_id,
            created_at=datetime.utcnow().isoformat()
        )
        db.add(new_fav)
        db.commit()
        return {"is_favorite": True}

@router.get("/favorites/{patient_id}")
def get_favorites(patient_id: str, db: Session = Depends(get_db)):
    favs = db.query(Favorite).filter(Favorite.user_id == patient_id).all()
    target_ids = [f.target_id for f in favs]
    doctors = db.query(User).filter(User.id.in_(target_ids)).all()
    return [model_to_dict(d, ["password"]) for d in doctors]

@router.get("/{doctor_id}/availability")
def get_availability(doctor_id: str, db: Session = Depends(get_db)):
    d = db.query(User).filter(User.id == doctor_id, User.role == "doctor").first()
    if not d:
        raise HTTPException(404, "الطبيب غير موجود")
        
    booked_apts = db.query(Appointment).filter(
        Appointment.doctor_id == doctor_id,
        Appointment.status.in_(["confirmed", "pending"])
    ).all()
    
    return {
        "available_days": d.available_days or [],
        "available_hours": d.available_hours or "",
        "booked_slots": [
            {"date": a.date, "time": a.time} for a in booked_apts
        ]
    }

@router.post("/{doctor_id}/reviews")
def add_review(doctor_id: str, req: ReviewRequest, db: Session = Depends(get_db)):
    doc = db.query(User).filter(User.id == doctor_id, User.role == "doctor").first()
    if not doc:
        raise HTTPException(404, "الطبيب غير موجود")
        
    new_review = Review(
        id=f"rev_{str(uuid.uuid4().hex)[:8]}",
        patient_id=req.patient_id,
        target_id=doctor_id,
        rating=req.rating,
        comment=req.comment,
        created_at=datetime.utcnow().isoformat()
    )
    db.add(new_review)
    
    # Recalculate average rating
    reviews = db.query(Review).filter(Review.target_id == doctor_id).all()
    total_rating = sum(r.rating for r in reviews) + req.rating
    new_total_reviews = len(reviews) + 1
    
    doc.rating = round(total_rating / new_total_reviews, 1)
    doc.total_reviews = new_total_reviews
    
    db.commit()
    return {"message": "تمت إضافة التقييم بنجاح", "new_rating": doc.rating, "total_reviews": doc.total_reviews}

@router.put("/{doctor_id}/profile")
def update_doctor_profile(doctor_id: str, updates: dict, db: Session = Depends(get_db)):
    doc = db.query(User).filter(User.id == doctor_id).first()
    if not doc:
        raise HTTPException(404, "الطبيب غير موجود")
        
    for key, value in updates.items():
        if hasattr(doc, key):
            setattr(doc, key, value)
            
    db.commit()
    return model_to_dict(doc, ["password"])

@router.get("/{doctor_id}/analytics")
def get_doctor_analytics(doctor_id: str, db: Session = Depends(get_db)):

    return {
        "monthly_appointments": [0] * 12,
        "weekly_stats": {
            "mon": 0, "tue": 0, "wed": 0, "thu": 0, "fri": 0, "sat": 0, "sun": 0
        },
        "revenue_summary": {
            "this_month": 0,
            "last_month": 0,
            "growth": 0
        }
    }

@router.post("/prescription")
def add_prescription(doctor_id: str, patient_id: str, data: dict, db: Session = Depends(get_db)):

    # 1. Create Prescription
    new_pres = Prescription(
        id=f"pre_{uuid.uuid4().hex[:8]}",
        doctor_id=doctor_id,
        patient_id=patient_id,
        medications=data.get("medications", []),
        notes=data.get("notes", ""),
        created_at=datetime.utcnow().isoformat()
    )
    db.add(new_pres)
    
    # 2. Create Medical Record entry
    doctor = db.query(User).filter(User.id == doctor_id).first()
    new_record = MedicalRecord(
        id=f"rec_{uuid.uuid4().hex[:8]}",
        patient_id=patient_id,
        uploaded_by=doctor.name if doctor else "Doctor",
        type="prescription",
        title=f"وصفة طبية - د. {doctor.name if doctor else ''}",
        content=str(data.get("medications", [])),
        date=datetime.utcnow().strftime("%Y-%m-%d"),
        created_at=datetime.utcnow().isoformat()
    )
    db.add(new_record)

    # 3. Create Notification for Patient
    new_notif = Notification(
        id=f"ntf_{uuid.uuid4().hex[:8]}",
        user_id=patient_id,
        title="وصفة طبية جديدة",
        message=f"أضاف الدكتور {doctor.name if doctor else ''} وصفة طبية جديدة لملفك.",
        type="prescription",
        created_at=datetime.utcnow().isoformat()
    )
    db.add(new_notif)
    
    db.commit()
    return model_to_dict(new_pres)
