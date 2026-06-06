from fastapi import APIRouter, Query, HTTPException, Depends
from typing import Optional
from sqlalchemy.orm import Session
from datetime import datetime, timezone
import uuid

from db import get_db
from models import Appointment, User, AuditLog, Notification, AppointmentAuditLog
from auth_utils import get_current_user
from utils.helpers import model_to_dict
from utils.secretary_permissions import require_secretary_permission

router = APIRouter()

APPOINTMENT_NOT_FOUND = (
    "الموعد غير موجود أو تم حذفه. اسحب لتحديث القائمة ثم أعد المحاولة."
)

ACTIVE_SLOT_STATUSES = [
    "pending",
    "confirmed",
    "reschedule_requested",
    "schedule_change_pending",
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


# def log_appointment_audit(..., old_status: str | None, new_status: str | None, ...):  # Python 3.10+
def log_appointment_audit(db: Session, appointment_id: str, user_id: str, action: str, old_status: Optional[str], new_status: Optional[str], details: str = ""):
    db.add(AppointmentAuditLog(
        id=f"aal_{uuid.uuid4().hex[:8]}",
        appointment_id=appointment_id,
        user_id=user_id,
        action=action,
        old_status=old_status,
        new_status=new_status,
        details=details,
        created_at=datetime.now(timezone.utc).isoformat(),
    ))


# def ensure_slot_available(..., appointment_id: str | None = None):  # Python 3.10+
def ensure_slot_available(db: Session, doctor_id: str, date: str, time: str, appointment_id: Optional[str] = None):
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
        raise HTTPException(status_code=409, detail="هذا الموعد محجوز بالفعل")

    pending_change = db.query(Appointment).filter(
        Appointment.doctor_id == doctor_id,
        Appointment.status == "schedule_change_pending",
        Appointment.requested_date == date,
        Appointment.requested_time == time,
    )
    if appointment_id:
        pending_change = pending_change.filter(Appointment.id != appointment_id)
    if pending_change.first():
        raise HTTPException(status_code=409, detail="هذا الموعد بانتظار موافقة المريض")


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


def _secretary_supervisor_id(db: Session, user_id: str) -> str:
    sec = db.query(User).filter(User.id == user_id, User.role == "secretary").first()
    if not sec or not sec.supervisor_id:
        raise HTTPException(status_code=403, detail="سكرتير غير مرتبط بطبيب")
    return sec.supervisor_id


@router.get("")
def list_appointments(
    patient_id: str = Query(None),
    doctor_id: str = Query(None),
    status: str = Query(None),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user["role"] == "secretary":
        supervisor_id = _secretary_supervisor_id(db, current_user["sub"])
        if doctor_id and doctor_id != supervisor_id:
            raise HTTPException(status_code=403, detail="ليس لديك صلاحية على مواعيد هذا الطبيب")
        doctor_id = supervisor_id
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
    reason = appointment.get("reason", "").strip()
    
    # Validate reason for patient-initiated bookings
    is_manual = appointment.get("status") == "manual" or current_user["role"] in ("doctor", "secretary")
    if not is_manual and not reason:
        raise HTTPException(400, "يجب تقديم وصف للحالة الصحية أو سبب الزيارة")
    
    ensure_slot_available(db, doctor_id, date, time)

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
        reason=reason,  # Reason for visit / وصف الحالة
        price=appointment.get("price", 0),
        record_access_granted=appointment.get("record_access_granted", False),
        created_at=now,
    )
    db.add(new_apt)
    db.add(AuditLog(id=f"al_{uuid.uuid4().hex[:8]}", user_id=patient_id, action="book_appointment", details="حجز موعد جديد", timestamp=now))
    log_appointment_audit(db, apt_id, patient_id, "book", None, status, f"date={date} time={time}")

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
    elif current_user["role"] == "secretary":
        require_secretary_permission(db, current_user, "appointments_create")
        appointment["doctor_id"] = _secretary_supervisor_id(db, current_user["sub"])
    return create_appointment(appointment, current_user, db)


def _get_appointment_or_404(db: Session, appointment_id: str) -> Appointment:
    apt = db.query(Appointment).filter(Appointment.id == (appointment_id or "").strip()).first()
    if not apt:
        raise HTTPException(404, APPOINTMENT_NOT_FOUND)
    return apt


def _assert_appointment_access(apt: Appointment, current_user: dict, db: Session):
    role = current_user.get("role")
    uid = current_user.get("sub")
    if role == "admin":
        return
    if role == "secretary":
        supervisor_id = _secretary_supervisor_id(db, uid)
        if apt.doctor_id != supervisor_id:
            raise HTTPException(403, "ليس لديك صلاحية على هذا الموعد")
        return
    if role == "doctor" and apt.doctor_id != uid:
        raise HTTPException(403, "ليس لديك صلاحية على هذا الموعد")
    if role == "patient" and apt.patient_id != uid:
        raise HTTPException(403, "ليس لديك صلاحية على هذا الموعد")


def _check_secretary_status_permission(db: Session, current_user: dict, apt: Appointment, new_status: str):
    if current_user.get("role") != "secretary":
        return
    if apt.status == "cancellation_requested" and new_status != "cancelled":
        require_secretary_permission(db, current_user, "appointments_respond")
        return
    if new_status == "confirmed":
        require_secretary_permission(db, current_user, "appointments_accept")
    elif new_status == "rejected":
        require_secretary_permission(db, current_user, "appointments_reject")
    elif new_status == "cancelled":
        if apt.status == "cancellation_requested":
            require_secretary_permission(db, current_user, "appointments_respond")
        else:
            require_secretary_permission(db, current_user, "appointments_remove")


@router.put("/{appointment_id}/status")
def update_appointment_status(appointment_id: str, status_update: dict, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    apt = _get_appointment_or_404(db, appointment_id)
    _assert_appointment_access(apt, current_user, db)

    old_status = apt.status
    new_status = status_update.get("status", apt.status)
    _check_secretary_status_permission(db, current_user, apt, new_status)
    rejection_note = status_update.get("rejection_note") or apt.rejection_note
    rejection_reason_type = status_update.get("rejection_reason_type")
    recommended_specialty = status_update.get("recommended_specialty")
    recommended_doctor_id = status_update.get("recommended_doctor_id")

    role = current_user.get("role")
    is_staff = role in ("doctor", "secretary", "admin")
    note_text = (rejection_note or "").strip()

    if new_status == "rejected" and is_staff and not note_text and not rejection_reason_type:
        raise HTTPException(status_code=400, detail="يجب إدخال سبب رفض الموعد")

    # Doctor/secretary cancelling (not approving a patient cancel request)
    if (
        new_status == "cancelled"
        and is_staff
        and not apt.cancel_requested
        and not note_text
        and not rejection_reason_type
    ):
        raise HTTPException(status_code=400, detail="يجب إدخال سبب الإلغاء")

    # Doctor approves patient cancel request — keep patient's reason if doctor did not add one
    if new_status == "cancelled" and is_staff and apt.status == "cancellation_requested":
        if not note_text and apt.rejection_note:
            rejection_note = apt.rejection_note
            note_text = rejection_note

    new_date = status_update.get("date", apt.date)
    new_time = status_update.get("time", apt.time)
    date_changed = new_date != apt.date or new_time != apt.time
    modification_note = (status_update.get("modification_note") or "").strip()

    if date_changed and is_staff:
        raise HTTPException(
            status_code=400,
            detail="لا يمكن تعديل الموعد مباشرة. أرسل طلب تعديل لموافقة المريض.",
        )

    if date_changed and new_status in ACTIVE_SLOT_STATUSES:
        ensure_slot_available(db, apt.doctor_id, new_date, new_time, appointment_id=apt.id)

    apt.status = new_status
    if not (date_changed and is_staff):
        apt.date = new_date
        apt.time = new_time
    if rejection_note:
        apt.rejection_note = rejection_note
    if rejection_reason_type:
        apt.rejection_reason_type = rejection_reason_type
    if recommended_specialty:
        apt.recommended_specialty = recommended_specialty
    if recommended_doctor_id:
        apt.recommended_doctor_id = recommended_doctor_id
    if new_status in ("confirmed", "cancelled", "rejected", "completed"):
        apt.reschedule_requested = False
        apt.cancel_requested = False
        apt.requested_date = None
        apt.requested_time = None
        apt.status_before_change = None

    doctor = db.query(User).filter(User.id == apt.doctor_id).first()
    doctor_name = doctor.name if doctor else ""
    if new_status == "confirmed" and old_status != "confirmed":
        add_notification(db, apt.patient_id, "تم تأكيد الموعد", f"تم تأكيد موعدك مع د. {doctor_name} بتاريخ {apt.date} الساعة {apt.time}", "appointment_confirmed")
    elif new_status in ("cancelled", "rejected"):
        reason_text = f" السبب: {rejection_note}" if rejection_note else ""
        rec_text = f" يُنصح بمراجعة: {recommended_specialty}" if recommended_specialty else ""
        add_notification(db, apt.patient_id, "تم رفض/إلغاء الموعد", f"تم تحديث موعدك مع د. {doctor_name}.{reason_text}{rec_text}", "appointment_rejected")
    elif new_status == "completed":
        add_notification(db, apt.patient_id, "تم إكمال الموعد", f"تم إكمال جلستك مع د. {doctor_name}", "appointment_completed")
    log_appointment_audit(db, apt.id, current_user["sub"], "status_update", old_status, new_status, rejection_note or "")

    db.commit()
    db.refresh(apt)
    return model_to_dict(apt)


@router.put("/{appointment_id}/propose-schedule-change")
def propose_schedule_change(
    appointment_id: str,
    data: dict,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Doctor proposes new date/time; patient must approve before it applies."""
    if current_user.get("role") not in ("doctor", "secretary", "admin"):
        raise HTTPException(status_code=403, detail="ليس لديك صلاحية")
    apt = _get_appointment_or_404(db, appointment_id)
    _assert_appointment_access(apt, current_user, db)
    if current_user.get("role") == "secretary":
        require_secretary_permission(db, current_user, "appointments_edit")

    if apt.status in ("schedule_change_pending", "reschedule_requested", "cancellation_requested"):
        raise HTTPException(status_code=409, detail="يوجد طلب تعديل معلق بالفعل")
    if apt.status not in ("confirmed", "pending", "patient_confirmation_pending"):
        raise HTTPException(status_code=400, detail="لا يمكن تعديل هذا الموعد في حالته الحالية")

    new_date = (data.get("date") or "").strip()
    new_time = (data.get("time") or "").strip()
    modification_note = (data.get("modification_note") or "").strip()
    if not new_date or not new_time or not modification_note:
        raise HTTPException(status_code=400, detail="يجب إدخال التاريخ والوقت وسبب التعديل")
    if new_date == apt.date and new_time == apt.time:
        raise HTTPException(status_code=400, detail="التاريخ والوقت الجديدان مطابقان للموعد الحالي")

    ensure_slot_available(db, apt.doctor_id, new_date, new_time, appointment_id=apt.id)

    old_status = apt.status
    apt.status_before_change = old_status
    apt.requested_date = new_date
    apt.requested_time = new_time
    apt.status = "schedule_change_pending"
    stamp = f"[سبب التعديل المقترح] {modification_note}"
    apt.notes = f"{apt.notes}\n{stamp}".strip() if apt.notes else stamp

    doctor = db.query(User).filter(User.id == apt.doctor_id).first()
    doctor_name = doctor.name if doctor else ""
    add_notification(
        db,
        apt.patient_id,
        "طلب تعديل موعد",
        f"اقترح د. {doctor_name} تغيير موعدك من {apt.date} {apt.time} إلى {new_date} {new_time}. السبب: {modification_note}",
        "schedule_change_request",
    )
    log_appointment_audit(
        db,
        apt.id,
        current_user["sub"],
        "propose_schedule_change",
        old_status,
        "schedule_change_pending",
        f"proposed={new_date} {new_time}",
    )
    db.commit()
    db.refresh(apt)
    return model_to_dict(apt)


@router.put("/{appointment_id}/respond-schedule-change")
def respond_schedule_change(
    appointment_id: str,
    data: dict,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Patient approves or rejects a doctor-proposed schedule change."""
    if current_user.get("role") != "patient":
        raise HTTPException(status_code=403, detail="ليس لديك صلاحية")
    apt = _get_appointment_or_404(db, appointment_id)
    _assert_appointment_access(apt, current_user, db)
    if apt.status != "schedule_change_pending":
        raise HTTPException(status_code=400, detail="لا يوجد طلب تعديل من الطبيب")

    action = data.get("action")
    doctor = db.query(User).filter(User.id == apt.doctor_id).first()
    doctor_name = doctor.name if doctor else ""
    old_status = apt.status
    restore_status = apt.status_before_change or "confirmed"

    if action == "approve":
        new_date = apt.requested_date
        new_time = apt.requested_time
        ensure_slot_available(db, apt.doctor_id, new_date, new_time, appointment_id=apt.id)
        apt.date = new_date
        apt.time = new_time
        apt.status = (
            restore_status
            if restore_status in ("pending", "confirmed", "patient_confirmation_pending")
            else "confirmed"
        )
        apt.requested_date = None
        apt.requested_time = None
        apt.status_before_change = None
        apt.reschedule_requested = False
        add_notification(
            db,
            apt.doctor_id,
            "موافقة على التعديل",
            f"وافق المريض على تغيير الموعد إلى {new_date} {new_time}",
            "schedule_change_approved",
        )
    elif action == "reject":
        reason = (data.get("rejection_note") or "").strip() or "رفض المريض تعديل الموعد"
        apt.status = restore_status if restore_status != "schedule_change_pending" else "confirmed"
        apt.requested_date = None
        apt.requested_time = None
        apt.status_before_change = None
        apt.reschedule_requested = False
        apt.rejection_note = reason
        add_notification(
            db,
            apt.doctor_id,
            "رفض تعديل الموعد",
            f"رفض المريض تغيير الموعد المقترح. السبب: {reason}",
            "schedule_change_rejected",
        )
    else:
        raise HTTPException(status_code=400, detail="إجراء غير صالح")

    log_appointment_audit(
        db,
        apt.id,
        current_user["sub"],
        f"respond_schedule_change_{action}",
        old_status,
        apt.status,
        data.get("rejection_note", ""),
    )
    db.commit()
    db.refresh(apt)
    return model_to_dict(apt)


@router.put("/{appointment_id}/request-reschedule")
def request_reschedule(appointment_id: str, data: dict, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    apt = _get_appointment_or_404(db, appointment_id)
    _assert_appointment_access(apt, current_user, db)
    if apt.status in ("schedule_change_pending", "reschedule_requested", "cancellation_requested"):
        raise HTTPException(status_code=409, detail="يوجد طلب تعديل معلق بالفعل")
    if apt.reschedule_requested:
        raise HTTPException(status_code=409, detail="يوجد طلب إعادة جدولة معلق بالفعل")
    old_status = apt.status
    new_date = data.get("date")
    new_time = data.get("time")
    if not new_date or not new_time:
        raise HTTPException(status_code=400, detail="يجب اختيار تاريخ ووقت جديدين")
    ensure_slot_available(db, apt.doctor_id, new_date, new_time, appointment_id=apt.id)
    apt.status_before_change = old_status
    apt.reschedule_requested = True
    apt.status = "reschedule_requested"
    apt.requested_date = new_date
    apt.requested_time = new_time
    patient = db.query(User).filter(User.id == apt.patient_id).first()
    add_notification(db, apt.doctor_id, "طلب إعادة جدولة", f"طلب {patient.name if patient else 'المريض'} إعادة جدولة الموعد إلى {apt.requested_date} {apt.requested_time}", "reschedule_request")
    log_appointment_audit(db, apt.id, current_user["sub"], "request_reschedule", old_status, "reschedule_requested", f"requested={new_date} {new_time}")
    db.commit()
    db.refresh(apt)
    return model_to_dict(apt)


@router.put("/{appointment_id}/respond-reschedule")
def respond_reschedule(appointment_id: str, data: dict, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """Doctor approves, rejects, or suggests alternative slot for reschedule request."""
    if current_user["role"] not in ("doctor", "secretary", "admin"):
        raise HTTPException(status_code=403, detail="ليس لديك صلاحية")
    apt = _get_appointment_or_404(db, appointment_id)
    _assert_appointment_access(apt, current_user, db)
    if current_user.get("role") == "secretary":
        require_secretary_permission(db, current_user, "appointments_respond")
    if apt.status != "reschedule_requested":
        raise HTTPException(status_code=400, detail="لا يوجد طلب إعادة جدولة معلق")
    action = data.get("action")  # approve, reject, suggest
    doctor = db.query(User).filter(User.id == apt.doctor_id).first()
    doctor_name = doctor.name if doctor else ""
    old_status = apt.status

    if action == "approve":
        new_date = data.get("date") or apt.requested_date
        new_time = data.get("time") or apt.requested_time
        ensure_slot_available(db, apt.doctor_id, new_date, new_time, appointment_id=apt.id)
        apt.date = new_date
        apt.time = new_time
        apt.status = "confirmed"
        apt.reschedule_requested = False
        apt.requested_date = None
        apt.requested_time = None
        apt.status_before_change = None
        add_notification(db, apt.patient_id, "تمت إعادة الجدولة", f"وافق د. {doctor_name} على إعادة جدولة موعدك إلى {new_date} {new_time}", "reschedule_approved")
    elif action == "suggest":
        alt_date = data.get("date")
        alt_time = data.get("time")
        if not alt_date or not alt_time:
            raise HTTPException(status_code=400, detail="يجب تحديد وقت بديل")
        apt.requested_date = alt_date
        apt.requested_time = alt_time
        apt.status = "reschedule_requested"
        add_notification(db, apt.patient_id, "اقتراح وقت بديل", f"اقترح د. {doctor_name} موعداً بديلاً: {alt_date} {alt_time}", "reschedule_suggested")
    else:
        restore = apt.status_before_change or "confirmed"
        apt.status = restore if restore in ("pending", "confirmed", "patient_confirmation_pending") else "confirmed"
        apt.reschedule_requested = False
        apt.requested_date = None
        apt.requested_time = None
        apt.status_before_change = None
        reason = data.get("rejection_note", "تم رفض طلب إعادة الجدولة")
        add_notification(db, apt.patient_id, "رفض إعادة الجدولة", f"رفض د. {doctor_name} طلب إعادة الجدولة. {reason}", "reschedule_rejected")

    log_appointment_audit(db, apt.id, current_user["sub"], f"respond_reschedule_{action}", old_status, apt.status, data.get("rejection_note", ""))
    db.commit()
    db.refresh(apt)
    return model_to_dict(apt)


@router.get("/{appointment_id}/audit")
def get_appointment_audit(appointment_id: str, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    logs = db.query(AppointmentAuditLog).filter(AppointmentAuditLog.appointment_id == appointment_id).order_by(AppointmentAuditLog.created_at.desc()).all()
    return [model_to_dict(l) for l in logs]


@router.put("/{appointment_id}/request-cancel")
def request_cancel(
    appointment_id: str,
    data: dict,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.get("role") != "patient":
        raise HTTPException(status_code=403, detail="يمكن للمريض فقط طلب الإلغاء")
    apt = _get_appointment_or_404(db, appointment_id)
    _assert_appointment_access(apt, current_user, db)

    reason = (data.get("reason") or data.get("cancellation_reason") or "").strip()
    if not reason:
        raise HTTPException(status_code=400, detail="يجب إدخال سبب الإلغاء")

    if apt.status == "cancellation_requested":
        return model_to_dict(apt)
    if apt.status in ("cancelled", "rejected", "completed"):
        raise HTTPException(status_code=400, detail="لا يمكن إلغاء هذا الموعد")
    if apt.status in ("schedule_change_pending", "reschedule_requested"):
        raise HTTPException(
            status_code=409,
            detail="يوجد طلب تعديل معلق. ألغِه أو انتظر الرد قبل طلب الإلغاء.",
        )

    old_status = apt.status
    apt.rejection_note = reason
    apt.reschedule_requested = False
    apt.requested_date = None
    apt.requested_time = None
    patient = db.query(User).filter(User.id == apt.patient_id).first()
    patient_name = patient.name if patient else "المريض"
    doctor = db.query(User).filter(User.id == apt.doctor_id).first()
    doctor_name = doctor.name if doctor else ""

    # Pending appointments: cancel immediately (no doctor approval needed)
    if old_status in ("pending", "patient_confirmation_pending"):
        apt.status = "cancelled"
        apt.cancel_requested = False
        apt.status_before_change = None
        add_notification(
            db,
            apt.doctor_id,
            "إلغاء موعد",
            f"ألغى {patient_name} الموعد بتاريخ {apt.date} الساعة {apt.time}. السبب: {reason}",
            "appointment_cancelled",
        )
        log_appointment_audit(db, apt.id, current_user["sub"], "cancel_immediate", old_status, "cancelled", reason)
    else:
        apt.cancel_requested = True
        apt.status = "cancellation_requested"
        apt.status_before_change = old_status
        add_notification(
            db,
            apt.doctor_id,
            "طلب إلغاء موعد",
            f"طلب {patient_name} إلغاء الموعد مع د. {doctor_name} بتاريخ {apt.date}. السبب: {reason}",
            "cancel_request",
        )
        log_appointment_audit(db, apt.id, current_user["sub"], "request_cancel", old_status, "cancellation_requested", reason)

    db.commit()
    db.refresh(apt)
    return model_to_dict(apt)


@router.put("/{appointment_id}/withdraw-cancel-request")
def withdraw_cancel_request(
    appointment_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Patient withdraws a pending cancellation request so the appointment is not stuck."""
    if current_user.get("role") != "patient":
        raise HTTPException(status_code=403, detail="ليس لديك صلاحية")
    apt = _get_appointment_or_404(db, appointment_id)
    _assert_appointment_access(apt, current_user, db)
    if apt.status != "cancellation_requested":
        raise HTTPException(status_code=400, detail="لا يوجد طلب إلغاء معلق")

    old_status = apt.status
    restore = apt.status_before_change or "confirmed"
    apt.status = restore if restore in ("pending", "confirmed", "patient_confirmation_pending") else "confirmed"
    apt.cancel_requested = False
    apt.status_before_change = None
    apt.rejection_note = None

    add_notification(
        db,
        apt.doctor_id,
        "سحب طلب الإلغاء",
        f"تراجع المريض عن طلب إلغاء الموعد بتاريخ {apt.date}",
        "cancel_request_withdrawn",
    )
    log_appointment_audit(db, apt.id, current_user["sub"], "withdraw_cancel", old_status, apt.status, "")
    db.commit()
    db.refresh(apt)
    return model_to_dict(apt)


@router.put("/{appointment_id}/access")
def toggle_record_access(appointment_id: str, access_update: dict, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    apt = _get_appointment_or_404(db, appointment_id)
    _assert_appointment_access(apt, current_user, db)
    apt.record_access_granted = access_update.get("granted", False)
    db.commit()
    db.refresh(apt)
    return model_to_dict(apt)


@router.delete("/{appointment_id}")
def cancel_appointment(appointment_id: str, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    apt = _get_appointment_or_404(db, appointment_id)
    _assert_appointment_access(apt, current_user, db)
    apt.status = "cancelled"
    db.commit()
    return {"message": "تم إلغاء الموعد"}
