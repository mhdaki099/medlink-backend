from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
import uuid

from db import get_db
from models import User, LabTest, LabBooking, LabResult

router = APIRouter()

def model_to_dict(model, exclude=None):
    if not model:
        return None
    exclude = exclude or []
    return {c.name: getattr(model, c.name) for c in model.__table__.columns if c.name not in exclude}

@router.get("")
def list_labs(db: Session = Depends(get_db)):
    labs = db.query(User).filter(User.role == "lab").all()
    return [model_to_dict(l, ["password"]) for l in labs]

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

@router.get("/{lab_id}/bookings")
def get_bookings(lab_id: str, db: Session = Depends(get_db)):
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
def upload_result(lab_id: str, result: dict, db: Session = Depends(get_db)):
    result_id = f"lr_{uuid.uuid4().hex[:8]}"
    new_result = LabResult(
        id=result_id,
        booking_id=result.get("booking_id"),
        patient_id=result.get("patient_id"),
        lab_id=lab_id,
        test_id=result.get("test_id"),
        uploaded_by=result.get("uploaded_by"),
        date=result.get("date"),
        values=result.get("values", []),
        notes=result.get("notes"),
        doctor_note=result.get("doctor_note")
    )
    db.add(new_result)
    db.commit()
    db.refresh(new_result)
    return model_to_dict(new_result)

@router.put("/bookings/{booking_id}/status")
def update_booking_status(booking_id: str, status_update: dict, db: Session = Depends(get_db)):
    booking = db.query(LabBooking).filter(LabBooking.id == booking_id).first()
    if not booking:
        raise HTTPException(404, "الحجز غير موجود")
        
    booking.status = status_update.get("status", booking.status)
    db.commit()
    db.refresh(booking)
    return model_to_dict(booking)
