from fastapi import APIRouter, Query, HTTPException, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timezone
import uuid

from db import get_db
from models import Appointment, User, AuditLog, Notification
from auth_utils import get_current_user
from utils.helpers import model_to_dict

router = APIRouter()

@router.get("")
def list_appointments(
    patient_id: str = Query(None), doctor_id: str = Query(None),
    status: str = Query(None), current_user: dict = Depends(get_current_user),
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
def create_appointment(appointment: dict, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    now = datetime.now(timezone.utc).isoformat()
    apt_id = f"apt_{uuid.uuid4().hex[:8]}"
    new_apt = Appointment(
        id=apt_id, patient_id=appointment.get("patient_id"),
        doctor_id=appointment.get("doctor_id"), date=appointment.get("date"),
        time=appointment.get("time"), status="pending", notes=appointment.get("notes"),
        price=appointment.get("price", 0),
        record_access_granted=appointment.get("record_access_granted", False),
        created_at=now
    )
    db.add(new_apt)
    db.add(AuditLog(id=f"al_{uuid.uuid4().hex[:8]}", user_id=new_apt.patient_id, action="book_appointment", details="حجز موعد جديد", timestamp=now))
    doctor = db.query(User).filter(User.id == appointment.get("doctor_id")).first()
    patient = db.query(User).filter(User.id == appointment.get("patient_id")).first()
    if doctor:
        db.add(Notification(id=f"ntf_{uuid.uuid4().hex[:8]}", user_id=doctor.id, title="موعد جديد", message=f"لديك موعد جديد من المريض {patient.name if patient else ''} بتاريخ {appointment.get('date')} الساعة {appointment.get('time')}", type="appointment", created_at=now))
    db.commit(); db.refresh(new_apt)
    return model_to_dict(new_apt)

@router.put("/{appointment_id}/status")
def update_appointment_status(appointment_id: str, status_update: dict, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    apt = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not apt:
        raise HTTPException(404, "الموعد غير موجود")
    old_status = apt.status
    new_status = status_update.get("status", apt.status)
    rejection_note = status_update.get("rejection_note", None)
    apt.status = new_status
    apt.date = status_update.get("date", apt.date)
    apt.time = status_update.get("time", apt.time)
    if rejection_note:
        apt.rejection_note = rejection_note
    if new_status in ("confirmed", "cancelled", "rejected"):
        apt.reschedule_requested = False
        apt.cancel_requested = False
        apt.requested_date = None
        apt.requested_time = None
    now = datetime.now(timezone.utc).isoformat()
    doctor = db.query(User).filter(User.id == apt.doctor_id).first()
    doctor_name = doctor.name if doctor else ""
    if new_status == "confirmed" and old_status != "confirmed":
        db.add(Notification(id=f"ntf_{uuid.uuid4().hex[:8]}", user_id=apt.patient_id, title="تم تأكيد الموعد ✅", message=f"تم تأكيد موعدك مع د. {doctor_name} بتاريخ {apt.date} الساعة {apt.time}", type="appointment_confirmed", created_at=now))
    elif new_status in ("cancelled", "rejected"):
        reason_text = f" — السبب: {rejection_note}" if rejection_note else ""
        db.add(Notification(id=f"ntf_{uuid.uuid4().hex[:8]}", user_id=apt.patient_id, title="تم رفض الموعد ❌", message=f"تم رفض موعدك مع د. {doctor_name}{reason_text}", type="appointment_rejected", created_at=now))
    elif new_status == "completed":
        db.add(Notification(id=f"ntf_{uuid.uuid4().hex[:8]}", user_id=apt.patient_id, title="تم إكمال الموعد ✅", message=f"تم إكمال جلستك مع د. {doctor_name}", type="appointment_completed", created_at=now))
    if status_update.get("date") or status_update.get("time"):
        if old_status == "confirmed" and new_status == "confirmed":
            db.add(Notification(id=f"ntf_{uuid.uuid4().hex[:8]}", user_id=apt.patient_id, title="تعديل موعد 📅", message=f"تم تعديل موعدك مع د. {doctor_name} إلى {apt.date} الساعة {apt.time}", type="appointment_modified", created_at=now))
    db.commit(); db.refresh(apt)
    return model_to_dict(apt)

@router.put("/{appointment_id}/request-reschedule")
def request_reschedule(appointment_id: str, data: dict, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    apt = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not apt:
        raise HTTPException(404, "الموعد غير موجود")
    apt.reschedule_requested = True
    apt.requested_date = data.get("date")
    apt.requested_time = data.get("time")
    patient = db.query(User).filter(User.id == apt.patient_id).first()
    db.add(Notification(id=f"ntf_{uuid.uuid4().hex[:8]}", user_id=apt.doctor_id, title="طلب إعادة جدولة 📅", message=f"طلب المريض {patient.name if patient else ''} إعادة جدولة الموعد إلى {data.get('date')} الساعة {data.get('time')}", type="reschedule_request", created_at=datetime.now(timezone.utc).isoformat()))
    db.commit(); db.refresh(apt)
    return model_to_dict(apt)

@router.put("/{appointment_id}/request-cancel")
def request_cancel(appointment_id: str, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    apt = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not apt:
        raise HTTPException(404, "الموعد غير موجود")
    apt.cancel_requested = True
    patient = db.query(User).filter(User.id == apt.patient_id).first()
    db.add(Notification(id=f"ntf_{uuid.uuid4().hex[:8]}", user_id=apt.doctor_id, title="طلب إلغاء موعد ❌", message=f"طلب المريض {patient.name if patient else ''} إلغاء الموعد بتاريخ {apt.date}", type="cancel_request", created_at=datetime.now(timezone.utc).isoformat()))
    db.commit(); db.refresh(apt)
    return model_to_dict(apt)

@router.put("/{appointment_id}/access")
def toggle_record_access(appointment_id: str, access_update: dict, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    apt = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not apt:
        raise HTTPException(404, "الموعد غير موجود")
    apt.record_access_granted = access_update.get("granted", False)
    db.commit(); db.refresh(apt)
    return model_to_dict(apt)

@router.delete("/{appointment_id}")
def cancel_appointment(appointment_id: str, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    apt = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not apt:
        raise HTTPException(404, "الموعد غير موجود")
    apt.status = "cancelled"
    db.commit()
    return {"message": "تم إلغاء الموعد"}
