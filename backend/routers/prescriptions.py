from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
import uuid
from datetime import datetime, timezone

from db import get_db
from models import Prescription, User, Notification
from auth_utils import get_current_user, require_role
from utils.helpers import model_to_dict

router = APIRouter()

@router.post("")
def create_prescription(data: dict, current_user: dict = Depends(require_role("doctor", "admin")), db: Session = Depends(get_db)):
    now = datetime.now(timezone.utc).isoformat()
    presc_id = f"pre_{uuid.uuid4().hex[:8]}"
    new_presc = Prescription(id=presc_id, doctor_id=data.get("doctor_id"), patient_id=data.get("patient_id"), medications=data.get("medications"), notes=data.get("notes"), is_dispensed=False, created_at=now)
    db.add(new_presc)
    doctor = db.query(User).filter(User.id == data.get("doctor_id")).first()
    db.add(Notification(id=f"ntf_{uuid.uuid4().hex[:8]}", user_id=data.get("patient_id"), title="وصفة طبية جديدة", message=f"لقد أرسل لك الدكتور {doctor.name if doctor else ''} وصفة طبية جديدة.", type="prescription", created_at=now))
    db.commit(); db.refresh(new_presc)
    return model_to_dict(new_presc)

@router.get("/patient/{patient_id}")
def get_patient_prescriptions(patient_id: str, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
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
def get_doctor_prescriptions(doctor_id: str, current_user: dict = Depends(require_role("doctor", "admin")), db: Session = Depends(get_db)):
    prescs = db.query(Prescription).filter(Prescription.doctor_id == doctor_id).order_by(Prescription.created_at.desc()).all()
    results = []
    for p in prescs:
        pdict = model_to_dict(p)
        patient = db.query(User).filter(User.id == p.patient_id).first()
        if patient:
            pdict["patient"] = model_to_dict(patient, ["password"])
        results.append(pdict)
    return results
