from fastapi import APIRouter, Query, HTTPException, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timezone
import uuid

from db import get_db
from models import MedicalHistoryRequest, User, Appointment, Notification
from auth_utils import get_current_user
from utils.helpers import model_to_dict

router = APIRouter()


def _assert_doctor_or_secretary_access(doctor_id: str, current_user: dict, db: Session):
    role = current_user.get("role")
    uid = current_user.get("sub")
    if role == "admin":
        return
    if role == "doctor" and uid == doctor_id:
        return
    if role == "secretary":
        sec = db.query(User).filter(User.id == uid, User.role == "secretary").first()
        if sec and sec.supervisor_id == doctor_id:
            return
    raise HTTPException(status_code=403, detail="ليس لديك صلاحية")


def _grant_record_access(db: Session, patient_id: str, doctor_id: str):
    """Persist access after patient approval — applies to all appointments for this pair."""
    appointments = db.query(Appointment).filter(
        Appointment.patient_id == patient_id,
        Appointment.doctor_id == doctor_id,
    ).all()
    for apt in appointments:
        apt.record_access_granted = True


@router.post("")
def create_request(patient_id: str, doctor_id: str, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    _assert_doctor_or_secretary_access(doctor_id, current_user, db)
    approved = db.query(MedicalHistoryRequest).filter(
        MedicalHistoryRequest.patient_id == patient_id,
        MedicalHistoryRequest.doctor_id == doctor_id,
        MedicalHistoryRequest.status == "approved",
    ).first()
    if approved:
        return model_to_dict(approved)

    existing = db.query(MedicalHistoryRequest).filter(
        MedicalHistoryRequest.patient_id == patient_id,
        MedicalHistoryRequest.doctor_id == doctor_id,
        MedicalHistoryRequest.status == "pending",
    ).first()
    if existing:
        return model_to_dict(existing)

    new_req = MedicalHistoryRequest(
        id=f"req_{uuid.uuid4().hex[:8]}",
        patient_id=patient_id,
        doctor_id=doctor_id,
        status="pending",
        created_at=datetime.now(timezone.utc).isoformat(),
    )
    db.add(new_req)
    db.commit()
    db.refresh(new_req)
    return model_to_dict(new_req)

@router.get("/doctor/{doctor_id}")
def get_doctor_requests(doctor_id: str, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    _assert_doctor_or_secretary_access(doctor_id, current_user, db)
    reqs = db.query(MedicalHistoryRequest, User.name.label("patient_name")).join(User, MedicalHistoryRequest.patient_id == User.id).filter(MedicalHistoryRequest.doctor_id == doctor_id).all()
    results = []
    for r, p_name in reqs:
        d = model_to_dict(r)
        d["patient_name"] = p_name
        results.append(d)
    return results

@router.get("/patient/{patient_id}")
def get_patient_requests(patient_id: str, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    reqs = db.query(MedicalHistoryRequest, User.name.label("doctor_name")).join(User, MedicalHistoryRequest.doctor_id == User.id).filter(MedicalHistoryRequest.patient_id == patient_id).all()
    results = []
    for r, d_name in reqs:
        d = model_to_dict(r)
        d["doctor_name"] = d_name
        results.append(d)
    return results

@router.put("/{request_id}/status")
def update_request_status(request_id: str, status: str, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    req = db.query(MedicalHistoryRequest).filter(MedicalHistoryRequest.id == request_id).first()
    if not req:
        raise HTTPException(404, "الطلب غير موجود")
    if status not in ["approved", "rejected"]:
        raise HTTPException(400, "حالة غير صالحة")
    req.status = status
    if status == "approved":
        _grant_record_access(db, req.patient_id, req.doctor_id)
        doctor = db.query(User).filter(User.id == req.doctor_id).first()
        db.add(Notification(
            id=f"ntf_{uuid.uuid4().hex[:8]}",
            user_id=req.doctor_id,
            title="تمت الموافقة على طلب الوصول",
            message=f"وافق المريض على مشاركة سجله الطبي معك — يمكنك الآن عرض التفاصيل الكاملة.",
            type="history_request_approved",
            created_at=datetime.now(timezone.utc).isoformat(),
        ))
    db.commit()
    return {"message": "تم تحديث الحالة", "status": status}
