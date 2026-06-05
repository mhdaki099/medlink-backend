from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from db import get_db
from models import User, Appointment, Order, LabBooking, LabTest, MedicalRecord, Notification, MedicalHistoryRequest, FamilyLink, PatientNote
from auth_utils import get_current_user, hash_password
from utils.helpers import model_to_dict, safe_update
import uuid
from datetime import datetime, timezone

router = APIRouter()

@router.get("")
def list_patients(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    patients = db.query(User).filter(User.role == "patient").all()
    return [model_to_dict(p, ["password"]) for p in patients]

@router.get("/by-uid/{uid}")
def get_patient_by_uid(uid: str, db: Session = Depends(get_db)):
    """Look up a patient by their unique patient ID (patient_unique_id)."""
    p = db.query(User).filter(User.patient_unique_id == uid).first()
    if not p:
        raise HTTPException(404, "لم يتم العثور على مريض بهذا المعرف")
    return model_to_dict(p, ["password"])


@router.post("/provisional")
def create_provisional_patient(data: dict, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """Create a provisional (unregistered) patient record for a doctor/secretary."""
    if current_user["role"] not in ("doctor", "secretary", "admin"):
        raise HTTPException(403, "ليس لديك صلاحية")
    phone = data.get("phone", "")
    name = data.get("name", "مريض غير مسجل")
    # Check if a real patient with this phone exists
    existing = db.query(User).filter(User.phone == phone, User.role == "patient").first()
    if existing:
        return model_to_dict(existing, ["password"])
    now = datetime.now(timezone.utc)
    uid = f"PT-{now.strftime('%Y%m%d')}{uuid.uuid4().hex[:6].upper()}"
    new_id = f"p_{uuid.uuid4().hex[:8]}"
    prov = User(
        id=new_id,
        role="patient",
        name=name,
        email=f"provisional_{new_id}@medlink.internal",
        password=hash_password(uuid.uuid4().hex),
        phone=phone,
        patient_unique_id=uid,
        is_active=False,
        verified=False,
        is_provisional=True,
        created_at=now.isoformat(),
    )
    db.add(prov)
    db.commit()
    db.refresh(prov)
    return model_to_dict(prov, ["password"])

@router.get("/{patient_id}")
def get_patient(patient_id: str, db: Session = Depends(get_db)):
    p = db.query(User).filter(User.id == patient_id, User.role == "patient").first()
    if not p:
        raise HTTPException(404, "المريض غير موجود")
    return model_to_dict(p, ["password"])

@router.put("/{patient_id}")
def update_patient(patient_id: str, updates: dict, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    # Only the patient themselves or admin can update
    if current_user["role"] == "patient" and current_user["sub"] != patient_id:
        raise HTTPException(403, "ليس لديك صلاحية")
    user = db.query(User).filter(User.id == patient_id, User.role == "patient").first()
    if not user:
        raise HTTPException(404, "المريض غير موجود")
    safe_update(user, updates)  # FIX: uses whitelist instead of raw setattr
    db.commit(); db.refresh(user)
    return model_to_dict(user, ["password"])

@router.get("/{patient_id}/notifications")
def get_notifications(patient_id: str, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    notifs = db.query(Notification).filter(Notification.user_id == patient_id).order_by(Notification.created_at.desc()).all()
    return [model_to_dict(n) for n in notifs]

@router.put("/notifications/{notification_id}/read")
def mark_notification_read(notification_id: str, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    notif = db.query(Notification).filter(Notification.id == notification_id).first()
    if not notif:
        raise HTTPException(404, "الإشعار غير موجود")
    notif.is_read = True
    db.commit()
    return {"message": "تم التحديث"}


@router.get("/{patient_id}/family")
def list_family_links(patient_id: str, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user["role"] == "patient" and current_user["sub"] != patient_id:
        raise HTTPException(403, "ليس لديك صلاحية")
    links = db.query(FamilyLink).filter(FamilyLink.main_patient_id == patient_id).all()
    return [model_to_dict(link) for link in links]


@router.post("/{patient_id}/family")
def add_family_link(patient_id: str, data: dict, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user["role"] == "patient" and current_user["sub"] != patient_id:
        raise HTTPException(403, "ليس لديك صلاحية")
    relation = data.get("relation")
    if relation not in {"child", "father", "mother", "spouse", "elderly"}:
        raise HTTPException(400, "صلة القرابة غير مدعومة")
    now = datetime.now(timezone.utc).isoformat()
    link = FamilyLink(
        id=f"fam_{uuid.uuid4().hex[:8]}",
        main_patient_id=patient_id,
        linked_patient_id=data.get("linked_patient_id"),
        relation=relation,
        name=data.get("name", ""),
        phone=data.get("phone", ""),
        consent_status="approved" if relation == "child" else "pending",
        created_at=now,
    )
    db.add(link)
    if link.linked_patient_id:
        db.add(Notification(id=f"ntf_{uuid.uuid4().hex[:8]}", user_id=link.linked_patient_id, title="طلب ربط حساب عائلي", message="يوجد طلب لربط سجلك الطبي بحساب عائلي.", type="family_link", created_at=now))
    db.commit()
    db.refresh(link)
    return model_to_dict(link)


@router.put("/family/{link_id}/consent")
def update_family_consent(link_id: str, data: dict, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    link = db.query(FamilyLink).filter(FamilyLink.id == link_id).first()
    if not link:
        raise HTTPException(404, "الرابط غير موجود")
    allowed_users = {link.main_patient_id}
    if link.linked_patient_id:
        allowed_users.add(link.linked_patient_id)
    if current_user["role"] == "patient" and current_user["sub"] not in allowed_users:
        raise HTTPException(403, "ليس لديك صلاحية")
    status = data.get("status")
    if status not in {"approved", "rejected"}:
        raise HTTPException(400, "حالة الموافقة غير صحيحة")
    link.consent_status = status
    db.commit()
    db.refresh(link)
    return model_to_dict(link)

@router.post("/history-request")
def create_history_request(data: dict, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    patient_id = data.get("patient_id")
    doctor_id = data.get("doctor_id")
    now = datetime.now(timezone.utc).isoformat()

    approved = db.query(MedicalHistoryRequest).filter(
        MedicalHistoryRequest.patient_id == patient_id,
        MedicalHistoryRequest.doctor_id == doctor_id,
        MedicalHistoryRequest.status == "approved",
    ).first()
    if approved:
        return model_to_dict(approved)

    pending = db.query(MedicalHistoryRequest).filter(
        MedicalHistoryRequest.patient_id == patient_id,
        MedicalHistoryRequest.doctor_id == doctor_id,
        MedicalHistoryRequest.status == "pending",
    ).first()
    if pending:
        return model_to_dict(pending)

    req_id = f"hrq_{uuid.uuid4().hex[:8]}"
    new_req = MedicalHistoryRequest(
        id=req_id, patient_id=patient_id, doctor_id=doctor_id, status="pending", created_at=now,
    )
    db.add(new_req)
    doctor = db.query(User).filter(User.id == doctor_id).first()
    db.add(Notification(
        id=f"ntf_{uuid.uuid4().hex[:8]}",
        user_id=patient_id,
        title="طلب وصول للسجل الطبي",
        message=f"يرغب الدكتور {doctor.name if doctor else ''} بالوصول إلى سجلك الطبي.",
        type="history_request",
        created_at=now,
    ))
    db.commit()
    return model_to_dict(new_req)

@router.get("/{patient_id}/history")
def get_patient_history(patient_id: str, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
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
    return {"appointments": apts_list, "orders": ords_list, "lab_bookings": bks_list, "records": recs_list}


@router.get("/{patient_id}/visits")
def get_patient_visits(patient_id: str, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Get complete patient visit timeline with appointments, consultation reports, 
    prescriptions, service requests, and notes - newest first.
    Enforces access control: doctor must have appointment/record_access_granted, patient sees own.
    """
    from models import ConsultationReport, ServiceRequest, Prescription, PatientNote
    
    # Access control
    if current_user["role"] == "patient":
        if current_user["sub"] != patient_id:
            raise HTTPException(403, "ليس لديك صلاحية")
    elif current_user["role"] == "doctor":
        # Check if doctor has any appointment with this patient or has been granted access
        has_access = db.query(Appointment).filter(
            Appointment.patient_id == patient_id,
            Appointment.doctor_id == current_user["sub"]
        ).first() is not None
        
        if not has_access:
            # Check if doctor has been granted record access
            apt_with_access = db.query(Appointment).filter(
                Appointment.patient_id == patient_id,
                Appointment.doctor_id == current_user["sub"],
                Appointment.record_access_granted == True
            ).first()
            if not apt_with_access:
                raise HTTPException(403, "ليس لديك صلاحية للوصول إلى سجل هذا المريض")
    elif current_user["role"] not in ("admin", "secretary"):
        raise HTTPException(403, "ليس لديك صلاحية")
    
    patient_user = db.query(User).filter(User.id == patient_id).first()

    reports = db.query(ConsultationReport).filter(
        ConsultationReport.patient_id == patient_id
    ).all()
    reports_by_id = {r.id: r for r in reports}
    reports_by_apt = {r.appointment_id: r for r in reports}
    apt_ids_with_report = set(reports_by_apt.keys())

    prescriptions_by_apt = {}
    for p in db.query(Prescription).filter(Prescription.patient_id == patient_id).all():
        if p.appointment_id:
            prescriptions_by_apt[p.appointment_id] = p

    service_requests_by_apt: dict = {}
    for sr in db.query(ServiceRequest).filter(ServiceRequest.patient_id == patient_id).all():
        report = reports_by_id.get(sr.consultation_report_id) if sr.consultation_report_id else None
        apt_id = report.appointment_id if report else None
        if apt_id:
            service_requests_by_apt.setdefault(apt_id, []).append(sr)

    apt_ids_with_services = set(service_requests_by_apt.keys())

    appointments = db.query(Appointment).filter(
        Appointment.patient_id == patient_id,
    ).order_by(Appointment.date.desc(), Appointment.time.desc()).all()
    appointments = [
        apt for apt in appointments
        if apt.status in ("completed", "confirmed")
        or apt.id in apt_ids_with_report
        or apt.id in apt_ids_with_services
    ]
    
    visits = []
    for apt in appointments:
        doctor = db.query(User).filter(User.id == apt.doctor_id).first()
        report = reports_by_apt.get(apt.id)
        prescription = prescriptions_by_apt.get(apt.id)
        service_requests = service_requests_by_apt.get(apt.id, [])
        
        # Get notes for this patient from this doctor
        notes = db.query(PatientNote).filter(
            PatientNote.patient_id == patient_id,
            PatientNote.doctor_id == apt.doctor_id
        ).order_by(PatientNote.created_at.desc()).limit(3).all()

        prescription_payload = None
        if prescription and (prescription.medications or prescription.prescription_code):
            prescription_payload = {
                "id": prescription.id,
                "medications": prescription.medications or [],
                "notes": prescription.notes or "",
                "prescription_code": prescription.prescription_code or "",
                "created_at": prescription.created_at,
            }
        
        visit = {
            "type": "appointment",
            "id": apt.id,
            "visit_date": apt.date,
            "visit_time": apt.time,
            "patient_name": patient_user.name if patient_user else "مريض",
            "patient_phone": patient_user.phone if patient_user else "",
            "doctor_name": doctor.name if doctor else "طبيب",
            "doctor_specialization": doctor.specialization if doctor else "",
            "complaint": apt.reason or apt.notes or "",
            "consultation_report": model_to_dict(report) if report else None,
            "prescription": prescription_payload,
            "service_requests": [
                {
                    "id": sr.id,
                    "request_type": sr.request_type,
                    "service_name": sr.service_name,
                    "reference_code": sr.reference_code,
                    "status": sr.status,
                    "notes": sr.notes,
                    "created_at": sr.created_at,
                    "appointment_id": apt.id,
                } for sr in service_requests
            ],
            "notes": [
                {
                    "note_text": n.note_text,
                    "created_at": n.created_at
                } for n in notes
            ],
            "follow_up": report.follow_up if report else "",
            "status": apt.status,
            "price": apt.price
        }
        visits.append(visit)

    # Uploaded medical records (documents, history, imaging, etc.)
    records = db.query(MedicalRecord).filter(
        MedicalRecord.patient_id == patient_id
    ).order_by(MedicalRecord.created_at.desc()).all()
    for rec in records:
        uploader = db.query(User).filter(User.id == rec.uploaded_by).first()
        visits.append({
            "type": "medical_record",
            "id": rec.id,
            "visit_date": rec.date,
            "visit_time": "",
            "record_type": rec.type,
            "title": rec.title,
            "content": rec.content,
            "uploaded_by": uploader.name if uploader else rec.uploaded_by,
            "created_at": rec.created_at,
        })

    visits.sort(
        key=lambda v: v.get("created_at") or f"{v.get('visit_date', '')} {v.get('visit_time', '')}",
        reverse=True,
    )
    
    return {
        "patient_id": patient_id,
        "total_visits": len(visits),
        "visits": visits
    }

@router.get("/{patient_id}/history-requests")
def list_patient_history_requests(patient_id: str, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
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
def update_history_request(request_id: str, data: dict, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    req = db.query(MedicalHistoryRequest).filter(MedicalHistoryRequest.id == request_id).first()
    if not req:
        raise HTTPException(404, "الطلب غير موجود")
    new_status = data.get("status", req.status)
    req.status = new_status
    if new_status == "approved":
        appointments = db.query(Appointment).filter(
            Appointment.patient_id == req.patient_id,
            Appointment.doctor_id == req.doctor_id,
        ).all()
        for apt in appointments:
            apt.record_access_granted = True
    db.commit()
    return model_to_dict(req)
