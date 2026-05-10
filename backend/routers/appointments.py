from fastapi import APIRouter, Query, HTTPException, Depends
from sqlalchemy.orm import Session
from datetime import datetime
import uuid

from db import get_db
from models import Appointment, User, AuditLog

router = APIRouter()

def model_to_dict(model, exclude=None):
    if not model:
        return None
    exclude = exclude or []
    return {c.name: getattr(model, c.name) for c in model.__table__.columns if c.name not in exclude}

@router.get("")
def list_appointments(
    patient_id: str = Query(None), 
    doctor_id: str = Query(None), 
    status: str = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(Appointment)
    if patient_id:
        query = query.filter(Appointment.patient_id == patient_id)
    if doctor_id:
        query = query.filter(Appointment.doctor_id == doctor_id)
    if status:
        query = query.filter(Appointment.status == status)
        
    apts = query.all()
    results = []
    
    for a in apts:
        apt_dict = model_to_dict(a)
        
        patient = db.query(User).filter(User.id == a.patient_id).first()
        doctor = db.query(User).filter(User.id == a.doctor_id).first()
        
        if patient:
            apt_dict["patient"] = model_to_dict(patient, ["password"])
        if doctor:
            apt_dict["doctor"] = model_to_dict(doctor, ["password"])
            
        results.append(apt_dict)
        
    return results

@router.post("")
def create_appointment(appointment: dict, db: Session = Depends(get_db)):
    apt_id = f"apt_{uuid.uuid4().hex[:8]}"
    
    new_apt = Appointment(
        id=apt_id,
        patient_id=appointment.get("patient_id"),
        doctor_id=appointment.get("doctor_id"),
        date=appointment.get("date"),
        time=appointment.get("time"),
        status="pending",
        notes=appointment.get("notes"),
        price=appointment.get("price", 0),
        record_access_granted=appointment.get("record_access_granted", False),
        created_at=datetime.utcnow().isoformat()
    )
    
    db.add(new_apt)
    
    # Log action
    log_id = f"al_{uuid.uuid4().hex[:8]}"
    new_log = AuditLog(
        id=log_id,
        user_id=new_apt.patient_id,
        action="book_appointment",
        details="حجز موعد جديد",
        timestamp=new_apt.created_at
    )
    db.add(new_log)
    
    db.commit()
    db.refresh(new_apt)
    return model_to_dict(new_apt)

@router.put("/{appointment_id}/status")
def update_appointment_status(appointment_id: str, status_update: dict, db: Session = Depends(get_db)):
    apt = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not apt:
        raise HTTPException(404, "الموعد غير موجود")
        
    apt.status = status_update.get("status", apt.status)
    apt.date = status_update.get("date", apt.date)
    apt.time = status_update.get("time", apt.time)
    db.commit()
    db.refresh(apt)
    return model_to_dict(apt)

@router.put("/{appointment_id}/access")
def toggle_record_access(appointment_id: str, access_update: dict, db: Session = Depends(get_db)):
    apt = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not apt:
        raise HTTPException(404, "الموعد غير موجود")
        
    apt.record_access_granted = access_update.get("granted", False)
    db.commit()
    db.refresh(apt)
    return model_to_dict(apt)

@router.delete("/{appointment_id}")
def cancel_appointment(appointment_id: str, db: Session = Depends(get_db)):
    apt = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not apt:
        raise HTTPException(404, "الموعد غير موجود")
        
    apt.status = "cancelled"
    db.commit()
    return {"message": "تم إلغاء الموعد"}
