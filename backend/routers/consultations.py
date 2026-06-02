"""
Consultation Reports & Service Requests router.
Handles post-appointment consultation reports, prescriptions, and lab/imaging requests.
"""
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timezone
import uuid, random, string

from db import get_db
from models import (
    ConsultationReport, ServiceRequest, Appointment, User,
    Prescription, MedicalRecord, Notification
)
from auth_utils import get_current_user, require_role
from utils.helpers import model_to_dict

router = APIRouter()


def _generate_ref_code(prefix: str = "REF") -> str:
    return f"{prefix}-{''.join(random.choices(string.digits + string.ascii_uppercase, k=8))}"


@router.post("")
def create_consultation_report(data: dict, current_user: dict = Depends(require_role("doctor", "admin")), db: Session = Depends(get_db)):
    """Create a consultation report after ending a session."""
    appointment_id = data.get("appointment_id")
    doctor_id = data.get("doctor_id") or current_user["sub"]
    patient_id = data.get("patient_id")

    if not appointment_id or not patient_id:
        raise HTTPException(400, "appointment_id و patient_id مطلوبان")

    apt = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not apt:
        raise HTTPException(404, "الموعد غير موجود")

    now = datetime.now(timezone.utc)
    existing = db.query(ConsultationReport).filter(
        ConsultationReport.appointment_id == appointment_id
    ).first()

    if existing:
        existing.condition_summary = data.get("condition_summary", existing.condition_summary)
        existing.is_healthy = bool(data.get("is_healthy", existing.is_healthy))
        existing.notes = data.get("notes", existing.notes)
        existing.follow_up = data.get("follow_up", existing.follow_up)
        report = existing
    else:
        report_id = f"cr_{uuid.uuid4().hex[:8]}"
        report = ConsultationReport(
            id=report_id,
            appointment_id=appointment_id,
            doctor_id=doctor_id,
            patient_id=patient_id,
            condition_summary=data.get("condition_summary", ""),
            is_healthy=bool(data.get("is_healthy", False)),
            notes=data.get("notes", ""),
            follow_up=data.get("follow_up", ""),
            created_at=now.isoformat(),
        )
        db.add(report)

        doctor = db.query(User).filter(User.id == doctor_id).first()
        db.add(MedicalRecord(
            id=f"rec_{uuid.uuid4().hex[:8]}",
            patient_id=patient_id,
            uploaded_by=doctor.name if doctor else "Doctor",
            type="consultation",
            title=f"تقرير استشارة - د. {doctor.name if doctor else ''}",
            content=data.get("condition_summary", ""),
            date=now.strftime("%Y-%m-%d"),
            created_at=now.isoformat(),
        ))

        db.add(Notification(
            id=f"ntf_{uuid.uuid4().hex[:8]}",
            user_id=patient_id,
            title="تقرير استشارة جديد",
            message=f"أضاف الدكتور {doctor.name if doctor else ''} تقرير استشارتك.",
            type="consultation_report",
            created_at=now.isoformat(),
        ))

    # Mark appointment as completed
    apt.status = "completed"
    apt.cancel_requested = False
    apt.reschedule_requested = False
    apt.requested_date = None
    apt.requested_time = None
    apt.status_before_change = None

    if existing:
        doctor = db.query(User).filter(User.id == doctor_id).first()
        db.add(Notification(
            id=f"ntf_{uuid.uuid4().hex[:8]}",
            user_id=patient_id,
            title="تحديث تقرير الاستشارة",
            message=f"حدّث الدكتور {doctor.name if doctor else ''} تقرير استشارتك.",
            type="consultation_report",
            created_at=now.isoformat(),
        ))

    db.commit()
    db.refresh(report)
    return model_to_dict(report)


@router.get("/appointment/{appointment_id}")
def get_report_by_appointment(appointment_id: str, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    report = db.query(ConsultationReport).filter(ConsultationReport.appointment_id == appointment_id).first()
    if not report:
        return None
    result = model_to_dict(report)
    # Attach service requests
    requests = db.query(ServiceRequest).filter(ServiceRequest.consultation_report_id == report.id).all()
    result["service_requests"] = [model_to_dict(r) for r in requests]
    return result


@router.get("/patient/{patient_id}")
def get_patient_reports(patient_id: str, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    reports = db.query(ConsultationReport).filter(
        ConsultationReport.patient_id == patient_id
    ).order_by(ConsultationReport.created_at.desc()).all()
    results = []
    for r in reports:
        rdict = model_to_dict(r)
        apt = db.query(Appointment).filter(Appointment.id == r.appointment_id).first()
        doctor = db.query(User).filter(User.id == r.doctor_id).first()
        if apt:
            rdict["appointment"] = model_to_dict(apt)
        if doctor:
            rdict["doctor"] = model_to_dict(doctor, ["password"])
        service_reqs = db.query(ServiceRequest).filter(ServiceRequest.consultation_report_id == r.id).all()
        rdict["service_requests"] = [model_to_dict(sr) for sr in service_reqs]
        results.append(rdict)
    return results


@router.post("/{report_id}/service-requests")
def add_service_request(report_id: str, data: dict, current_user: dict = Depends(require_role("doctor", "admin")), db: Session = Depends(get_db)):
    """Add a lab or radiology request to a consultation report."""
    report = db.query(ConsultationReport).filter(ConsultationReport.id == report_id).first()
    if not report:
        raise HTTPException(404, "التقرير غير موجود")

    request_type = data.get("request_type", "lab")
    if request_type not in ("lab", "radiology"):
        raise HTTPException(400, "نوع الطلب غير صحيح")

    prefix = "LAB" if request_type == "lab" else "RAD"
    ref_code = _generate_ref_code(prefix)

    now = datetime.now(timezone.utc)
    sr = ServiceRequest(
        id=f"sr_{uuid.uuid4().hex[:8]}",
        consultation_report_id=report_id,
        doctor_id=report.doctor_id,
        patient_id=report.patient_id,
        request_type=request_type,
        service_name=data.get("service_name", ""),
        reference_code=ref_code,
        notes=data.get("notes", ""),
        status="pending",
        created_at=now.isoformat(),
    )
    db.add(sr)

    # Notify patient
    doctor = db.query(User).filter(User.id == report.doctor_id).first()
    db.add(Notification(
        id=f"ntf_{uuid.uuid4().hex[:8]}",
        user_id=report.patient_id,
        title=f"طلب {'تحليل' if request_type == 'lab' else 'أشعة'} جديد",
        message=f"أصدر الدكتور {doctor.name if doctor else ''} طلب {data.get('service_name', '')}. رمز الطلب: {ref_code}",
        type="service_request",
        created_at=now.isoformat(),
    ))

    db.commit()
    db.refresh(sr)
    return model_to_dict(sr)


@router.get("/service-requests/patient/{patient_id}")
def get_patient_service_requests(patient_id: str, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    requests = db.query(ServiceRequest).filter(
        ServiceRequest.patient_id == patient_id
    ).order_by(ServiceRequest.created_at.desc()).all()
    results = []
    for r in requests:
        rdict = model_to_dict(r)
        doctor = db.query(User).filter(User.id == r.doctor_id).first()
        if doctor:
            rdict["doctor"] = model_to_dict(doctor, ["password"])
        results.append(rdict)
    return results
