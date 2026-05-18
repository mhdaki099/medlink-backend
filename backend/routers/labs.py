from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
import uuid
from datetime import datetime, timezone

from db import get_db
from models import User, LabTest, LabBooking, LabResult, ServiceBooking, Notification
from auth_utils import get_current_user, require_role
from utils.helpers import model_to_dict

router = APIRouter()

@router.get("")
def list_labs(db: Session = Depends(get_db)):
    labs = db.query(User).filter(User.role == "lab").all()
    return [model_to_dict(l, ["password"]) for l in labs]


@router.get("/radiology")
def list_radiology_centers(db: Session = Depends(get_db)):
    centers = db.query(User).filter(User.role == "radiology").all()
    return [model_to_dict(c, ["password"]) for c in centers]


@router.get("/service-bookings")
def list_service_bookings(
    patient_id: str = None,
    provider_id: str = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from fastapi import Query as Q
    query = db.query(ServiceBooking)
    if patient_id:
        query = query.filter(ServiceBooking.patient_id == patient_id)
    if provider_id:
        query = query.filter(ServiceBooking.provider_id == provider_id)
    results = []
    for b in query.order_by(ServiceBooking.created_at.desc()).all():
        bdict = model_to_dict(b)
        patient = db.query(User).filter(User.id == b.patient_id).first()
        provider = db.query(User).filter(User.id == b.provider_id).first()
        if patient:
            bdict["patient"] = model_to_dict(patient, ["password"])
        if provider:
            bdict["provider"] = model_to_dict(provider, ["password"])
        results.append(bdict)
    return results


@router.post("/service-bookings")
def create_service_booking(data: dict, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    provider_role = data.get("provider_role", "lab")
    if provider_role not in {"lab", "radiology"}:
        raise HTTPException(400, "نوع الخدمة غير مدعوم")
    visit_type = data.get("visit_type", "visit_center")
    if visit_type not in {"visit_center", "home_service"}:
        raise HTTPException(400, "نوع الزيارة غير صحيح")
    now = datetime.now(timezone.utc).isoformat()
    booking = ServiceBooking(
        id=f"sb_{uuid.uuid4().hex[:8]}",
        patient_id=data.get("patient_id"),
        provider_id=data.get("provider_id"),
        provider_role=provider_role,
        service_id=data.get("service_id"),
        service_name=data.get("service_name"),
        date=data.get("date"),
        time=data.get("time"),
        visit_type=visit_type,
        home_service_fee=float(data.get("home_service_fee", 0) or 0),
        status="booked",
        created_at=now,
    )
    db.add(booking)
    db.add(Notification(id=f"ntf_{uuid.uuid4().hex[:8]}", user_id=booking.provider_id, title="حجز خدمة جديد", message=f"تم إنشاء حجز {booking.service_name or ''} بتاريخ {booking.date} الساعة {booking.time}", type="service_booking", created_at=now))
    db.commit()
    db.refresh(booking)
    return model_to_dict(booking)

@router.get("/tests/all")
def all_tests(db: Session = Depends(get_db)):
    tests = db.query(LabTest).all()
    return [model_to_dict(t) for t in tests]

@router.get("/tests/{test_id}")
def get_test(test_id: str, db: Session = Depends(get_db)):
    test = db.query(LabTest).filter(LabTest.id == test_id).first()
    if not test:
        raise HTTPException(404, "الفحص غير موجود")
    return model_to_dict(test)

@router.put("/bookings/{booking_id}/status")
def update_booking_status(booking_id: str, status_update: dict, current_user: dict = Depends(require_role("lab", "admin")), db: Session = Depends(get_db)):
    booking = db.query(LabBooking).filter(LabBooking.id == booking_id).first()
    if not booking:
        raise HTTPException(404, "الحجز غير موجود")
    booking.status = status_update.get("status", booking.status)
    db.commit(); db.refresh(booking)
    return model_to_dict(booking)

@router.get("/{lab_id}")
def get_lab(lab_id: str, db: Session = Depends(get_db)):
    lab = db.query(User).filter(User.id == lab_id, User.role == "lab").first()
    if not lab:
        raise HTTPException(404, "المختبر غير موجود")
    return model_to_dict(lab, ["password"])

@router.get("/{lab_id}/tests")
def get_lab_tests(lab_id: str, db: Session = Depends(get_db)):
    tests = db.query(LabTest).filter(LabTest.lab_id == lab_id).all()
    return [model_to_dict(t) for t in tests]

@router.get("/{lab_id}/bookings")
def get_bookings(lab_id: str, current_user: dict = Depends(require_role("lab", "admin")), db: Session = Depends(get_db)):
    bookings = db.query(LabBooking).filter(LabBooking.lab_id == lab_id).all()
    results = []
    for b in bookings:
        bdict = model_to_dict(b)
        patient = db.query(User).filter(User.id == b.patient_id).first()
        test = db.query(LabTest).filter(LabTest.id == b.test_id).first()
        if patient:
            bdict["patient"] = model_to_dict(patient, ["password"])
        if test:
            bdict["test"] = model_to_dict(test)
        results.append(bdict)
    return results

@router.post("/{lab_id}/results")
def upload_result(lab_id: str, result: dict, current_user: dict = Depends(require_role("lab", "admin")), db: Session = Depends(get_db)):
    result_id = f"lr_{uuid.uuid4().hex[:8]}"
    new_result = LabResult(id=result_id, booking_id=result.get("booking_id"), patient_id=result.get("patient_id"), lab_id=lab_id, test_id=result.get("test_id"), uploaded_by=result.get("uploaded_by"), date=result.get("date"), values=result.get("values", []), notes=result.get("notes"), doctor_note=result.get("doctor_note"))
    db.add(new_result); db.commit(); db.refresh(new_result)
    return model_to_dict(new_result)
