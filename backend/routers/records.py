from fastapi import APIRouter, Query, HTTPException, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timezone
import uuid

from db import get_db
from models import MedicalRecord, LabResult, LabBooking, LabTest, User
from auth_utils import get_current_user
from utils.helpers import model_to_dict

router = APIRouter()

@router.get("")
def list_records(patient_id: str = Query(None), doctor_id: str = Query(None), record_owner: str = Query(None), current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    query = db.query(MedicalRecord)
    if patient_id:
        query = query.filter(MedicalRecord.patient_id == patient_id)
    if record_owner:
        query = query.filter(MedicalRecord.record_owner == record_owner)
    records = query.all()
    if doctor_id:
        records = [r for r in records if r.shared_with and doctor_id in r.shared_with]
    return [model_to_dict(r) for r in records]

@router.post("")
def upload_record(record: dict, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    mr_id = f"mr_{uuid.uuid4().hex[:8]}"
    new_mr = MedicalRecord(id=mr_id, patient_id=record.get("patient_id"), uploaded_by=record.get("uploaded_by"), type=record.get("type"), title=record.get("title"), content=record.get("content"), date=record.get("date", datetime.now(timezone.utc).strftime("%Y-%m-%d")), shared_with=record.get("shared_with", []), record_owner=record.get("record_owner", "self"), created_at=datetime.now(timezone.utc).isoformat())
    db.add(new_mr); db.commit(); db.refresh(new_mr)
    return model_to_dict(new_mr)

@router.put("/{record_id}/share")
def update_sharing(record_id: str, share_data: dict, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    rec = db.query(MedicalRecord).filter(MedicalRecord.id == record_id).first()
    if not rec:
        raise HTTPException(404, "السجل غير موجود")
    rec.shared_with = share_data.get("shared_with", rec.shared_with or [])
    db.commit(); db.refresh(rec)
    return model_to_dict(rec)

@router.delete("/{record_id}/share/{doctor_id}")
def revoke_access(record_id: str, doctor_id: str, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    rec = db.query(MedicalRecord).filter(MedicalRecord.id == record_id).first()
    if not rec:
        raise HTTPException(404, "السجل غير موجود")
    current_shared = rec.shared_with or []
    rec.shared_with = [d for d in current_shared if d != doctor_id]
    db.commit(); db.refresh(rec)
    return model_to_dict(rec)

@router.get("/lab-results")
def get_lab_results(patient_id: str = Query(None), current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    query = db.query(LabResult)
    if patient_id:
        query = query.filter(LabResult.patient_id == patient_id)
    results = query.all()
    enriched = []
    for r in results:
        rdict = model_to_dict(r)
        test = db.query(LabTest).filter(LabTest.id == r.test_id).first()
        lab = db.query(User).filter(User.id == r.lab_id).first()
        if test:
            rdict["test"] = model_to_dict(test)
        if lab:
            rdict["lab"] = model_to_dict(lab, ["password"])
        enriched.append(rdict)
    return enriched

@router.get("/lab-results/{result_id}")
def get_lab_result(result_id: str, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    r = db.query(LabResult).filter(LabResult.id == result_id).first()
    if not r:
        raise HTTPException(404, "النتيجة غير موجودة")
    rdict = model_to_dict(r)
    test = db.query(LabTest).filter(LabTest.id == r.test_id).first()
    lab = db.query(User).filter(User.id == r.lab_id).first()
    if test:
        rdict["test"] = model_to_dict(test)
    if lab:
        rdict["lab"] = model_to_dict(lab, ["password"])
    return rdict

@router.get("/lab-bookings")
def get_lab_bookings(patient_id: str = Query(None), current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    query = db.query(LabBooking)
    if patient_id:
        query = query.filter(LabBooking.patient_id == patient_id)
    bookings = query.all()
    enriched = []
    for b in bookings:
        bdict = model_to_dict(b)
        test = db.query(LabTest).filter(LabTest.id == b.test_id).first()
        lab = db.query(User).filter(User.id == b.lab_id).first()
        if test:
            bdict["test"] = model_to_dict(test)
        if lab:
            bdict["lab"] = model_to_dict(lab, ["password"])
        enriched.append(bdict)
    return enriched

@router.post("/lab-bookings")
def book_lab_test(booking: dict, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    lb_id = f"lb_{uuid.uuid4().hex[:8]}"
    new_lb = LabBooking(id=lb_id, patient_id=booking.get("patient_id"), lab_id=booking.get("lab_id"), test_id=booking.get("test_id"), date=booking.get("date"), time=booking.get("time"), status="booked", created_at=datetime.now(timezone.utc).isoformat())
    db.add(new_lb); db.commit(); db.refresh(new_lb)
    return model_to_dict(new_lb)
