from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
import uuid
import random
import string
from datetime import datetime, timezone

from db import get_db
from models import Prescription, User, Notification, MedicalRecord
from auth_utils import get_current_user, require_role
from utils.helpers import model_to_dict
from utils.secretary_permissions import require_secretary_permission, get_secretary_user

router = APIRouter()


def generate_prescription_code() -> str:
    return "RX-" + "".join(random.choices(string.digits, k=8))


def init_fulfillment_items(medications: list) -> list:
    items = []
    for idx, med in enumerate(medications):
        items.append({
            "index": idx,
            "name": med.get("name", ""),
            "dosage": med.get("dosage", ""),
            "frequency": med.get("frequency", med.get("duration", "")),
            "duration": med.get("duration", ""),
            "status": "pending",
            "dispensed_at": None,
            "substitution": None,
            "unavailable_reason": None,
        })
    return items


def sync_prescription_status(prescription: Prescription):
    items = prescription.fulfillment_items or []
    if not items:
        prescription.status = "pending"
        prescription.is_dispensed = False
        return
    dispensed = sum(1 for i in items if i.get("status") in ("dispensed", "substituted"))
    if dispensed == 0:
        prescription.status = "pending"
        prescription.is_dispensed = False
    elif dispensed < len(items):
        prescription.status = "partially_dispensed"
        prescription.is_dispensed = False
    else:
        prescription.status = "fully_dispensed"
        prescription.is_dispensed = True
        prescription.closed_at = datetime.now(timezone.utc).isoformat()


def prescription_with_people(db: Session, p: Prescription):
    pdict = model_to_dict(p)
    doctor = db.query(User).filter(User.id == p.doctor_id).first()
    patient = db.query(User).filter(User.id == p.patient_id).first()
    if doctor:
        pdict["doctor"] = model_to_dict(doctor, ["password"])
    if patient:
        pdict["patient"] = model_to_dict(patient, ["password"])
    return pdict


@router.post("")
def create_prescription(data: dict, current_user: dict = Depends(require_role("doctor", "secretary", "admin")), db: Session = Depends(get_db)):
    if current_user.get("role") == "secretary":
        require_secretary_permission(db, current_user, "prescriptions_create")
        sec = get_secretary_user(db, current_user["sub"])
        if sec and sec.supervisor_id:
            data["doctor_id"] = sec.supervisor_id
    now = datetime.now(timezone.utc).isoformat()
    presc_id = f"pre_{uuid.uuid4().hex[:8]}"
    medications = data.get("medications", [])
    code = generate_prescription_code()
    while db.query(Prescription).filter(Prescription.prescription_code == code).first():
        code = generate_prescription_code()
    fulfillment = init_fulfillment_items(medications)
    new_presc = Prescription(
        id=presc_id,
        doctor_id=data.get("doctor_id"),
        patient_id=data.get("patient_id"),
        prescription_code=code,
        medications=medications,
        fulfillment_items=fulfillment,
        notes=data.get("notes"),
        status="pending",
        is_dispensed=False,
        created_at=now,
    )
    db.add(new_presc)
    doctor = db.query(User).filter(User.id == data.get("doctor_id")).first()
    db.add(Notification(
        id=f"ntf_{uuid.uuid4().hex[:8]}",
        user_id=data.get("patient_id"),
        title="وصفة طبية جديدة",
        message=f"وصفة جديدة من د. {doctor.name if doctor else ''}. رمز الوصفة: {code}",
        type="prescription",
        created_at=now,
    ))
    db.commit()
    db.refresh(new_presc)
    return model_to_dict(new_presc)


@router.get("/patient/{patient_id}")
def get_patient_prescriptions(patient_id: str, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    prescs = db.query(Prescription).filter(Prescription.patient_id == patient_id).order_by(Prescription.created_at.desc()).all()
    return [prescription_with_people(db, p) for p in prescs]


@router.get("/doctor/{doctor_id}")
def get_doctor_prescriptions(doctor_id: str, current_user: dict = Depends(require_role("doctor", "admin")), db: Session = Depends(get_db)):
    prescs = db.query(Prescription).filter(Prescription.doctor_id == doctor_id).order_by(Prescription.created_at.desc()).all()
    return [prescription_with_people(db, p) for p in prescs]


@router.get("/search")
def search_prescriptions(
    code: str = Query(None),
    patient_name: str = Query(None),
    phone: str = Query(None),
    current_user: dict = Depends(require_role("pharmacy", "admin")),
    db: Session = Depends(get_db),
):
    query = db.query(Prescription)
    if code:
        query = query.filter(Prescription.prescription_code.ilike(f"%{code.strip()}%"))
    results = query.order_by(Prescription.created_at.desc()).limit(50).all()
    filtered = []
    for p in results:
        patient = db.query(User).filter(User.id == p.patient_id).first()
        if patient_name and patient_name.lower() not in (patient.name or "").lower():
            continue
        if phone and phone not in (patient.phone or ""):
            continue
        filtered.append(prescription_with_people(db, p))
    return filtered


@router.get("/{prescription_id}")
def get_prescription(prescription_id: str, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    p = db.query(Prescription).filter(Prescription.id == prescription_id).first()
    if not p:
        raise HTTPException(404, "الوصفة غير موجودة")
    return prescription_with_people(db, p)


@router.put("/{prescription_id}/dispense")
def dispense_medicine(prescription_id: str, data: dict, current_user: dict = Depends(require_role("pharmacy", "admin")), db: Session = Depends(get_db)):
    """Mark individual medicine as dispensed, unavailable, or substituted."""
    p = db.query(Prescription).filter(Prescription.id == prescription_id).first()
    if not p:
        raise HTTPException(404, "الوصفة غير موجودة")
    if p.status == "fully_dispensed":
        raise HTTPException(status_code=400, detail="الوصفة مغلقة بالكامل")

    item_index = data.get("item_index")
    action = data.get("action", "dispense")  # dispense, unavailable, substitute
    items = list(p.fulfillment_items or init_fulfillment_items(p.medications or []))
    if item_index is None or item_index >= len(items):
        raise HTTPException(status_code=400, detail="عنصر غير صالح")

    now = datetime.now(timezone.utc).isoformat()
    item = items[item_index]
    if action == "dispense":
        item["status"] = "dispensed"
        item["dispensed_at"] = now
    elif action == "unavailable":
        item["status"] = "unavailable"
        item["unavailable_reason"] = data.get("reason", "غير متوفر")
    elif action == "substitute":
        item["status"] = "substituted"
        item["substitution"] = {
            "original": item.get("name"),
            "substitute_name": data.get("substitute_name"),
            "reason": data.get("reason", ""),
            "dispensed_at": now,
        }
        doctor = db.query(User).filter(User.id == p.doctor_id).first()
        db.add(Notification(
            id=f"ntf_{uuid.uuid4().hex[:8]}",
            user_id=p.doctor_id,
            title="استبدال دواء",
            message=f"استبدلت الصيدلية {item.get('name')} بـ {data.get('substitute_name')} للمريض.",
            type="prescription_substitution",
            created_at=now,
        ))

    p.fulfillment_items = items
    p.pharmacy_id = data.get("pharmacy_id") or current_user.get("sub")
    sync_prescription_status(p)
    db.commit()
    db.refresh(p)
    return model_to_dict(p)
