from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
import uuid
from datetime import datetime

from db import get_db
from models import Prescription, User, Notification

router = APIRouter()

def model_to_dict(model, exclude=None):
    if not model:
        return None
    exclude = exclude or []
    return {c.name: getattr(model, c.name) for c in model.__table__.columns if c.name not in exclude}

@router.post("")
def create_prescription(data: dict, db: Session = Depends(get_db)):
    u_hex = uuid.uuid4().hex
    presc_id = f"pre_{u_hex[:8]}"
    
    new_presc = Prescription(
        id=presc_id,
        doctor_id=data.get("doctor_id"),
        patient_id=data.get("patient_id"),
        medications=data.get("medications"), # Expecting a list of dicts
        notes=data.get("notes"),
        is_dispensed=False,
        created_at=datetime.utcnow().isoformat()
    )
    db.add(new_presc)
    
    # Notify Patient
    doctor = db.query(User).filter(User.id == data.get("doctor_id")).first()
    u_hex = uuid.uuid4().hex
    new_notif = Notification(
        id=f"ntf_{u_hex[:8]}",
        user_id=data.get("patient_id"),
        title="وصفة طبية جديدة",
        message=f"لقد أرسل لك الدكتور {doctor.name if doctor else ''} وصفة طبية جديدة.",
        type="prescription",
        created_at=datetime.utcnow().isoformat()
    )
    db.add(new_notif)
    
    db.commit()
    db.refresh(new_presc)
    return model_to_dict(new_presc)

@router.get("/patient/{patient_id}")
def get_patient_prescriptions(patient_id: str, db: Session = Depends(get_db)):
    prescs = db.query(Prescription).filter(Prescription.patient_id == patient_id).order_by(Prescription.created_at.desc()).all()
    results = []
    for p in prescs:
        pdict = model_to_dict(p)
        doctor = db.query(User).filter(User.id == p.doctor_id).first()
        if doctor:
            pdict["doctor"] = model_to_dict(doctor, ["password"])
        results.append(pdict)
    return results

@router.get("/doctor/{doctor_id}")
def get_doctor_prescriptions(doctor_id: str, db: Session = Depends(get_db)):
    prescs = db.query(Prescription).filter(Prescription.doctor_id == doctor_id).order_by(Prescription.created_at.desc()).all()
    results = []
    for p in prescs:
        pdict = model_to_dict(p)
        patient = db.query(User).filter(User.id == p.patient_id).first()
        if patient:
            pdict["patient"] = model_to_dict(patient, ["password"])
        results.append(pdict)
    return results
