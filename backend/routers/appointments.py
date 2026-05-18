from fastapi import APIRouter, Query, HTTPException, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timezone
import uuid

from db import get_db
from models import Appointment, User, AuditLog, Notification
from auth_utils import get_current_user
from utils.helpers import model_to_dict

router = APIRouter()

ACTIVE_SLOT_STATUSES = [
    "pending",
    "confirmed",
    "reschedule_requested",
    "cancellation_requested",
    "patient_confirmation_pending",
]


def add_notification(db: Session, user_id: str, title: str, message: str, type_: str):
    db.add(Notification(
        id=f"ntf_{uuid.uuid4().hex[:8]}",
        user_id=user_id,
        title=title,
        message=message,
        type=type_,
        created_at=datetime.now(timezone.utc).isoformat(),
    ))


def ensure_slot_available(db: Session, doctor_id: str, date: str, time: str, appointment_id: str | None = None):
    if not doctor_id or not date or not time:
        raise HTTPException(status_code=400, detail="بيانات الموعد غير مكتملة")
    query = db.query(Appointment).filter(
        Appointment.doctor_id == doctor_id,
        Appointment.date == date,
        Appointment.time == time,
        Appointment.status.in_(ACTIVE_SLOT_STATUSES),
    )
    if appointment_id:
        query = query.filter(Appointment.id != appointment_id)
    if query.first():
        raise HTTPException(status_code=409, detail="This appointment is already booked.")


def appointment_with_people(db: Session, apt: Appointment):
    apt_dict = model_to_dict(apt)
    patient = db.query(User).filter(User.id == apt.patient_id).first()
    doctor = db.query(User).filter(User.id == apt.doctor_id).first()
    if patient:
        apt_dict["patient"] = model_to_dict(patient, ["password"])
    if doctor:
        apt_dict["doctor"] = model_to_dict(doctor, ["password"])
        apt_dict["doctor_name"] = doctor.name
    return apt_dict


@router.get("")
def list_appointments(
    patient_id: str = Query(None),
    doctor_id: str = Query(None),
    status: str = Query(None),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Appointment)
    if patient_id:
        query = query.filter(Appointment.patient_id == patient_id)
    if doctor_id:
        query = query.filter(Appointment.doctor_id == doctor_id)
    if status:
        query = query.filter(Appointment.status == status)
    return [appointment_with_people(db, a) for a in query.order_by(Appointment.created_at.desc()).all()]


@router.post("")
def create_appointment(appointment: dict, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    now = datetime.now(timezone.utc).isoformat()
    doctor_id = appointment.get("doctor_id")
    patient_id = appointment.get("patient_id")
    date = appointment.get("date")
    time = appointment.get("time")
    ensure_slot_available(db, doctor_id, date, time)

    is_manual = appointment.get("status") == "manual" or current_user["role"] in ("doctor", "secretary")
    status = "patient_confirmation_pending" if is_manual else "pending"
    apt_id = f"apt_{uuid.uuid4().hex[:8]}"
    new_apt = Appointment(
        id=apt_id,
        patient_id=patient_id,
        doctor_id=doctor_id,
        date=date,
        time=time,
        status=status,
        notes=appointment.get("notes"),
        price=appointment.get("price", 0),
        record_access_granted=appointment.get("record_access_granted", False),
        created_at=now,
    )
    db.add(new_apt)
    db.add(AuditLog(id=f"al_{uuid.uuid4().hex[:8]}", user_id=patient_id, action="book_appointment", details="حجز موعد جديد", timestamp=now))

    doctor = db.query(User).filter(User.id == doctor_id).first()
    patient = db.query(User).filter(User.id == patient_id).first()
    if status == "pending" and doctor:
        add_notification(db, doctor.id, "موعد جديد", f"لديك موعد جديد من {patient.name if patient else 'مريض'} بتاريخ {date} الساعة {time}", "appointment")
    if status == "patient_confirmation_pending" and patient:
        add_notification(db, patient.id, "موعد مقترح", f"تم إنشاء موعد لك مع د. {doctor.name if doctor else ''} بتاريخ {date} الساعة {time}. يمكنك قبوله أو رفضه.", "manual_appointment")
    db.commit()
    db.refresh(new_apt)
    return model_to_dict(new_apt)


@router.post("/manual")
def create_manual_appointment(appointment: dict, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user["role"] not in ("doctor", "secretary", "admin"):
        raise HTTPException(status_code=403, detail="ليس لديك صلاحية")
    appointment["status"] = "manual"
    if current_user["role"] == "doctor":
        appointment["doctor_id"] = current_user["sub"]
    return create_appointment(appointment, current_user, db)


@router.put("/{appointment_id}/status")
def update_appointment_status(appointment_id: str, status_update: dict, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    apt = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not apt:
        raise HTTPException(404, "الموعد غير موجود")

    old_status = apt.status
    new_status = status_update.get("status", apt.status)
    rejection_note = status_update.get("rejection_note") or apt.rejection_note
    if new_status == "rejected" and not rejection_note:
        raise HTTPException(status_code=400, detail="يجب إدخال سبب رفض الموعد")

    new_date = status_update.get("date", apt.date)
    new_time = status_update.get("time", apt.time)
    if (new_date != apt.date or new_time != apt.time) and new_status in ACTIVE_SLOT_STATUSES:
        ensure_slot_available(db, apt.doctor_id, new_date, new_time, appointment_id=apt.id)

    apt.status = new_status
    apt.date = new_date
    apt.time = new_time
    if rejection_note:
        apt.rejection_note = rejection_note
    if new_status in ("confirmed", "cancelled", "rejected", "completed"):
        apt.reschedule_requested = False
        apt.cancel_requested = False
        apt.requested_date = None
        apt.requested_time = None

    doctor = db.query(User).filter(User.id == apt.doctor_id).first()
    doctor_name = doctor.name if doctor else ""
    if new_status == "confirmed" and old_status != "confirmed":
        add_notification(db, apt.patient_id, "تم تأكيد الموعد", f"تم تأكيد موعدك مع د. {doctor_name} بتاريخ {apt.date} الساعة {apt.time}", "appointment_confirmed")
    elif new_status in ("cancelled", "rejected"):
        reason_text = f" السبب: {rejection_note}" if rejection_note else ""
        add_notification(db, apt.patient_id, "تم رفض/إلغاء الموعد", f"تم تحديث موعدك مع د. {doctor_name}.{reason_text}", "appointment_rejected")
    elif new_status == "completed":
        add_notification(db, apt.patient_id, "تم إكمال الموعد", f"تم إكمال جلستك مع د. {doctor_name}", "appointment_completed")
    if (status_update.get("date") or status_update.get("time")) and old_status == "confirmed" and new_status == "confirmed":
        add_notification(db, apt.patient_id, "تعديل موعد", f"تم تعديل موعدك مع د. {doctor_name} إلى {apt.date} الساعة {apt.time}", "appointment_modified")

    db.commit()
    db.refresh(apt)
    return model_to_dict(apt)


@router.put("/{appointment_id}/request-reschedule")
def request_reschedule(appointment_id: str, data: dict, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    apt = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not apt:
        raise HTTPException(404, "الموعد غير موجود")
    apt.reschedule_requested = True
    apt.status = "reschedule_requested"
    apt.requested_date = data.get("date")
    apt.requested_time = data.get("time")
    patient = db.query(User).filter(User.id == apt.patient_id).first()
    add_notification(db, apt.doctor_id, "طلب إعادة جدولة", f"طلب {patient.name if patient else 'المريض'} إعادة جدولة الموعد إلى {apt.requested_date or 'وقت جديد'} {apt.requested_time or ''}", "reschedule_request")
    db.commit()
    db.refresh(apt)
    return model_to_dict(apt)


@router.put("/{appointment_id}/request-cancel")
def request_cancel(appointment_id: str, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    apt = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not apt:
        raise HTTPException(404, "الموعد غير موجود")
    apt.cancel_requested = True
    apt.status = "cancellation_requested"
    patient = db.query(User).filter(User.id == apt.patient_id).first()
    add_notification(db, apt.doctor_id, "طلب إلغاء موعد", f"طلب {patient.name if patient else 'المريض'} إلغاء الموعد بتاريخ {apt.date}", "cancel_request")
    db.commit()
    db.refresh(apt)
    return model_to_dict(apt)


@router.put("/{appointment_id}/access")
def toggle_record_access(appointment_id: str, access_update: dict, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    apt = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not apt:
        raise HTTPException(404, "الموعد غير موجود")
    apt.record_access_granted = access_update.get("granted", False)
    db.commit()
    db.refresh(apt)
    return model_to_dict(apt)


@router.delete("/{appointment_id}")
def cancel_appointment(appointment_id: str, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    apt = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not apt:
        raise HTTPException(404, "الموعد غير موجود")
    apt.status = "cancelled"
    db.commit()
    return {"message": "تم إلغاء الموعد"}
