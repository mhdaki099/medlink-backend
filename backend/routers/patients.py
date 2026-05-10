from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from db import get_db
from models import User, Appointment, Order, LabBooking, LabTest, MedicalRecord, Notification, MedicalHistoryRequest
import uuid
from datetime import datetime

router = APIRouter()

def model_to_dict(model, exclude=None):
    if not model:
        return None
    exclude = exclude or []
    return {c.name: getattr(model, c.name) for c in model.__table__.columns if c.name not in exclude}

@router.get("")
def list_patients(db: Session = Depends(get_db)):
    patients = db.query(User).filter(User.role == "patient").all()
    return [model_to_dict(p, ["password"]) for p in patients]

@router.get("/{patient_id}")
def get_patient(patient_id: str, db: Session = Depends(get_db)):
    p = db.query(User).filter(User.id == patient_id, User.role == "patient").first()
    if not p:
        raise HTTPException(404, "المريض غير موجود")
    return model_to_dict(p, ["password"])

@router.put("/{patient_id}")
def update_patient(patient_id: str, updates: dict, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == patient_id, User.role == "patient").first()
    if not user:
        raise HTTPException(404, "المريض غير موجود")
    
    updates.pop("password", None)
    updates.pop("id", None)
    
    for key, value in updates.items():
        if hasattr(user, key):
            setattr(user, key, value)
            
    db.commit()
    db.refresh(user)
    return model_to_dict(user, ["password"])

@router.get("/{patient_id}/notifications")
def get_notifications(patient_id: str, db: Session = Depends(get_db)):
    notifs = db.query(Notification).filter(Notification.user_id == patient_id).order_by(Notification.created_at.desc()).all()
    return [model_to_dict(n) for n in notifs]

@router.post("/history-request")
def create_history_request(data: dict, db: Session = Depends(get_db)):
    u_hex = uuid.uuid4().hex
    req_id = f"hrq_{u_hex[:8]}"
    new_req = MedicalHistoryRequest(
        id=req_id,
        patient_id=data.get("patient_id"),
        doctor_id=data.get("doctor_id"),
        status="pending",
        created_at=datetime.utcnow().isoformat()
    )
    db.add(new_req)
    
    doctor = db.query(User).filter(User.id == data.get("doctor_id")).first()
    u_hex = uuid.uuid4().hex
    new_notif = Notification(
        id=f"ntf_{u_hex[:8]}",
        user_id=data.get("patient_id"),
        title="طلب وصول للسجل الطبي",
        message=f"يرغب الدكتور {doctor.name if doctor else ''} بالوصول إلى سجلك الطبي.",
        type="history_request",
        created_at=datetime.utcnow().isoformat()
    )
    db.add(new_notif)
    
    db.commit()
    return model_to_dict(new_req)

@router.get("/{patient_id}/history")
def get_patient_history(patient_id: str, db: Session = Depends(get_db)):
    appointments = db.query(Appointment).filter(Appointment.patient_id == patient_id).all()
    apts_list = []
    for a in appointments:
        doc = db.query(User).filter(User.id == a.doctor_id).first()
        adict = model_to_dict(a)
        if doc:
            adict["doctor"] = model_to_dict(doc, ["password"])
        apts_list.append(adict)

    orders = db.query(Order).filter(Order.patient_id == patient_id).all()
    ords_list = []
    for o in orders:
        ph = db.query(User).filter(User.id == o.pharmacy_id).first()
        odict = model_to_dict(o)
        if ph:
            odict["pharmacy"] = model_to_dict(ph, ["password"])
        ords_list.append(odict)

    lab_bookings = db.query(LabBooking).filter(LabBooking.patient_id == patient_id).all()
    bks_list = []
    for b in lab_bookings:
        test = db.query(LabTest).filter(LabTest.id == b.test_id).first()
        lab = db.query(User).filter(User.id == b.lab_id).first()
        bdict = model_to_dict(b)
        if test:
            bdict["test"] = model_to_dict(test)
        if lab:
            bdict["lab"] = model_to_dict(lab, ["password"])
        bks_list.append(bdict)

    records = db.query(MedicalRecord).filter(MedicalRecord.patient_id == patient_id).all()
    recs_list = [model_to_dict(r) for r in records]

    return {
        "appointments": apts_list,
        "orders": ords_list,
        "lab_bookings": bks_list,
        "records": recs_list,
    }

@router.get("/{patient_id}/history-requests")
def list_patient_history_requests(patient_id: str, db: Session = Depends(get_db)):
    requests = db.query(MedicalHistoryRequest).filter(MedicalHistoryRequest.patient_id == patient_id).all()
    res = []
    for r in requests:
        d = model_to_dict(r)
        doctor = db.query(User).filter(User.id == r.doctor_id).first()
        if doctor and d:
            d["doctor_name"] = doctor.name
        res.append(d)
    return res

@router.put("/history-requests/{request_id}")
def update_history_request(request_id: str, data: dict, db: Session = Depends(get_db)):
    req = db.query(MedicalHistoryRequest).filter(MedicalHistoryRequest.id == request_id).first()
    if not req:
        raise HTTPException(404, "الطلب غير موجود")
    
    req.status = data.get("status", req.status)
    db.commit()
    return model_to_dict(req)
