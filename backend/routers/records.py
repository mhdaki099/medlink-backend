"""
Medical records router - patient visit history and records timeline.
"""
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timezone
import uuid

from db import get_db
from models import (
    User, Appointment, ConsultationReport, Prescription,
    ServiceRequest, MedicalRecord, LabBooking, LabResult
)
from auth_utils import get_current_user
from utils.helpers import model_to_dict

router = APIRouter()


@router.get("/patients/{patient_id}/visits")
def get_patient_visits(
    patient_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get complete visit history for a patient.
    Returns appointments, consultation reports, prescriptions, 
    lab/radiology requests, and medical records.
    """
    # Verify access rights
    if current_user["role"] == "patient" and current_user["sub"] != patient_id:
        raise HTTPException(403, "ليس لديك صلاحية الوصول إلى هذه السجلات")
    
    # Get patient info
    patient = db.query(User).filter(User.id == patient_id, User.role == "patient").first()
    if not patient:
        raise HTTPException(404, "المريض غير موجود")
    
    visits = []
    
    # 1. Get all appointments with their reports
    appointments = db.query(Appointment).filter(
        Appointment.patient_id == patient_id
    ).order_by(Appointment.date.desc(), Appointment.time.desc()).all()
    
    for apt in appointments:
        visit = {
            "type": "appointment",
            "id": apt.id,
            "date": apt.date,
            "time": apt.time,
            "status": apt.status,
            "reason": apt.reason,
            "notes": apt.notes,
            "doctor_id": apt.doctor_id,
            "created_at": apt.created_at,
        }
        
        # Get doctor info
        doctor = db.query(User).filter(User.id == apt.doctor_id).first()
        if doctor:
            visit["doctor"] = {
                "id": doctor.id,
                "name": doctor.name,
                "specialization": doctor.specialization,
            }
        
        # Get consultation report if exists
        report = db.query(ConsultationReport).filter(
            ConsultationReport.appointment_id == apt.id
        ).first()
        
        if report:
            visit["consultation_report"] = {
                "id": report.id,
                "condition_summary": report.condition_summary,
                "is_healthy": report.is_healthy,
                "notes": report.notes,
                "follow_up": report.follow_up,
                "created_at": report.created_at,
            }
            
            # Get service requests (lab/radiology)
            service_reqs = db.query(ServiceRequest).filter(
                ServiceRequest.consultation_report_id == report.id
            ).all()
            
            if service_reqs:
                visit["service_requests"] = [
                    {
                        "id": sr.id,
                        "request_type": sr.request_type,
                        "service_name": sr.service_name,
                        "reference_code": sr.reference_code,
                        "status": sr.status,
                        "notes": sr.notes,
                    }
                    for sr in service_reqs
                ]
        
        # Get prescriptions for this appointment
        prescriptions = db.query(Prescription).filter(
            Prescription.patient_id == patient_id,
            Prescription.created_at >= apt.created_at,
        ).order_by(Prescription.created_at.desc()).limit(5).all()
        
        if prescriptions:
            visit["prescriptions"] = [
                {
                    "id": p.id,
                    "prescription_code": p.prescription_code,
                    "medications": p.medications,
                    "notes": p.notes,
                    "status": p.status,
                    "created_at": p.created_at,
                }
                for p in prescriptions
            ]
        
        visits.append(visit)
    
    # 2. Get medical records (uploaded documents)
    records = db.query(MedicalRecord).filter(
        MedicalRecord.patient_id == patient_id
    ).order_by(MedicalRecord.created_at.desc()).all()
    
    for rec in records:
        visits.append({
            "type": "medical_record",
            "id": rec.id,
            "record_type": rec.type,
            "title": rec.title,
            "content": rec.content,
            "date": rec.date,
            "uploaded_by": rec.uploaded_by,
            "created_at": rec.created_at,
        })
    
    # Sort all visits by date/time
    visits.sort(key=lambda x: (x.get("date", ""), x.get("time", "")), reverse=True)
    
    return {
        "patient": model_to_dict(patient, ["password"]),
        "visits": visits,
        "total_visits": len(visits),
    }


@router.get("/patients/{patient_id}/timeline")
def get_patient_timeline_summary(
    patient_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get a condensed timeline summary for quick overview.
    """
    # Verify access
    if current_user["role"] == "patient" and current_user["sub"] != patient_id:
        raise HTTPException(403, "ليس لديك صلاحية")
    
    patient = db.query(User).filter(User.id == patient_id).first()
    if not patient:
        raise HTTPException(404, "المريض غير موجود")
    
    # Count different types
    appointment_count = db.query(Appointment).filter(
        Appointment.patient_id == patient_id
    ).count()
    
    report_count = db.query(ConsultationReport).filter(
        ConsultationReport.patient_id == patient_id
    ).count()
    
    prescription_count = db.query(Prescription).filter(
        Prescription.patient_id == patient_id
    ).count()
    
    service_request_count = db.query(ServiceRequest).filter(
        ServiceRequest.patient_id == patient_id
    ).count()
    
    # Get last visit
    last_appointment = db.query(Appointment).filter(
        Appointment.patient_id == patient_id
    ).order_by(Appointment.date.desc()).first()
    
    return {
        "patient_id": patient_id,
        "patient_name": patient.name,
        "summary": {
            "total_appointments": appointment_count,
            "consultation_reports": report_count,
            "prescriptions": prescription_count,
            "lab_radiology_requests": service_request_count,
        },
        "last_visit": {
            "date": last_appointment.date if last_appointment else None,
            "time": last_appointment.time if last_appointment else None,
            "status": last_appointment.status if last_appointment else None,
        } if last_appointment else None,
    }
