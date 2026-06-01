"""
Admin router - full account management, audit logs, and dashboard.
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timezone, timedelta
import uuid

from db import get_db
from models import (
    User, RegistrationRequest, Appointment, AuditLog, 
    ServiceBooking, Order, Prescription, MedicalRecord
)
from auth_utils import require_role
from utils.helpers import model_to_dict

router = APIRouter()


@router.get("/dashboard")
def get_dashboard_stats(current_user: dict = Depends(require_role("admin")), db: Session = Depends(get_db)):
    """Get admin dashboard statistics."""
    # User counts by role
    user_counts = {}
    for role in ["patient", "doctor", "pharmacy", "lab", "radiology", "warehouse"]:
        user_counts[role] = db.query(User).filter(User.role == role, User.is_active == True).count()
    
    # Pending registrations
    pending_count = db.query(RegistrationRequest).filter(RegistrationRequest.status == "pending").count()
    
    # Today's appointments
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    today_appointments = db.query(Appointment).filter(Appointment.date == today).count()
    
    # Recent activity
    recent_logs = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(10).all()
    
    return {
        "user_counts": user_counts,
        "pending_registrations": pending_count,
        "today_appointments": today_appointments,
        "recent_activity": [model_to_dict(log) for log in recent_logs],
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/users")
def list_users(
    role: str = Query(None),
    verified: bool = Query(None),
    search: str = Query(None),
    current_user: dict = Depends(require_role("admin")),
    db: Session = Depends(get_db)
):
    """List all users with optional filters."""
    query = db.query(User)
    
    if role:
        query = query.filter(User.role == role)
    if verified is not None:
        query = query.filter(User.verified == verified)
    if search:
        query = query.filter(
            (User.name.ilike(f"%{search}%")) |
            (User.email.ilike(f"%{search}%")) |
            (User.phone.ilike(f"%{search}%"))
        )
    
    users = query.order_by(User.created_at.desc()).all()
    return [model_to_dict(u, ["password"]) for u in users]


@router.get("/users/{user_id}")
def get_user_detail(
    user_id: str,
    current_user: dict = Depends(require_role("admin")),
    db: Session = Depends(get_db)
):
    """Get detailed user information including documents."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "المستخدم غير موجود")
    
    result = model_to_dict(user, ["password"])
    
    # Get related records based on role
    if user.role == "patient":
        appointments = db.query(Appointment).filter(Appointment.patient_id == user_id).count()
        result["appointment_count"] = appointments
    elif user.role == "doctor":
        appointments = db.query(Appointment).filter(Appointment.doctor_id == user_id).count()
        result["appointment_count"] = appointments
    
    return result


@router.put("/users/{user_id}")
def update_user(
    user_id: str,
    updates: dict,
    current_user: dict = Depends(require_role("admin")),
    db: Session = Depends(get_db)
):
    """Update user information."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "المستخدم غير موجود")
    
    for key, value in updates.items():
        if hasattr(user, key) and key != "id":
            setattr(user, key, value)
    
    db.commit()
    db.refresh(user)
    return model_to_dict(user, ["password"])


@router.delete("/users/{user_id}")
def delete_user(
    user_id: str,
    current_user: dict = Depends(require_role("admin")),
    db: Session = Depends(get_db)
):
    """Soft delete a user by setting is_active to False."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "المستخدم غير موجود")
    
    user.is_active = False
    db.commit()
    return {"message": "تم حذف المستخدم بنجاح"}


@router.get("/registrations")
def list_registration_requests(
    status: str = Query(None),
    current_user: dict = Depends(require_role("admin")),
    db: Session = Depends(get_db)
):
    """List pending registration requests."""
    query = db.query(RegistrationRequest)
    if status:
        query = query.filter(RegistrationRequest.status == status)
    requests = query.order_by(RegistrationRequest.created_at.desc()).all()
    return [model_to_dict(r) for r in requests]


@router.post("/registrations/{request_id}/approve")
def approve_registration(
    request_id: str,
    current_user: dict = Depends(require_role("admin")),
    db: Session = Depends(get_db)
):
    """Approve a registration request and create the user."""
    req = db.query(RegistrationRequest).filter(RegistrationRequest.id == request_id).first()
    if not req:
        raise HTTPException(404, "الطلب غير موجود")
    if req.status != "pending":
        raise HTTPException(400, "الطلب ليس في حالة معلقة")
    
    data = req.data or {}
    role = req.role
    
    # Create user based on role
    new_id = f"{role[0]}_{uuid.uuid4().hex[:8]}"
    full_name = f"{data.get('first_name', '')} {data.get('last_name', '')}".strip()
    
    # Check for duplicate email/phone
    if db.query(User).filter(User.email == req.email).first():
        raise HTTPException(400, "البريد الإلكتروني مستخدم مسبقاً")
    
    new_user = User(
        id=new_id,
        role=role,
        name=full_name,
        email=req.email,
        password=data.get('password', ''),  # Should already be hashed
        phone=data.get('phone', ''),
        city=data.get('city', data.get('province', '')),
        province=data.get('province', ''),
        district=data.get('district', ''),
        area=data.get('area', ''),
        address=data.get('address', ''),
        photo=data.get('photo', ''),
        is_active=True,
        verified=True,
        created_at=datetime.now(timezone.utc).isoformat(),
        # Role-specific fields
        specialization=data.get('specialization', ''),
        specialization_en=data.get('specialization_en', ''),
        clinic_name=data.get('clinic_name', ''),
        clinic_address=data.get('clinic_address', ''),
        price_per_session=data.get('price_per_session', 0),
        experience_years=data.get('experience_years', 0),
        available_hours=data.get('available_hours', ''),
        working_hours=data.get('working_hours', {}),
        consultation_duration=data.get('consultation_duration', 30),
        buffer_minutes=data.get('buffer_minutes', 10),
        open_hours=data.get('open_hours', ''),
        license_no=data.get('license_no', ''),
        association_no=data.get('association_no', ''),
        documents=data.get('documents', []),
        lat=data.get('lat'),
        lng=data.get('lng'),
    )
    
    db.add(new_user)
    req.status = "approved"
    db.commit()
    
    return {
        "message": "تمت الموافقة على الطلب بنجاح",
        "user_id": new_id,
    }


@router.post("/registrations/{request_id}/reject")
def reject_registration(
    request_id: str,
    reason: dict,
    current_user: dict = Depends(require_role("admin")),
    db: Session = Depends(get_db)
):
    """Reject a registration request."""
    req = db.query(RegistrationRequest).filter(RegistrationRequest.id == request_id).first()
    if not req:
        raise HTTPException(404, "الطلب غير موجود")
    if req.status != "pending":
        raise HTTPException(400, "الطلب ليس في حالة معلقة")
    
    req.status = "rejected"
    # Could store rejection reason if we add that field
    db.commit()
    
    return {"message": "تم رفض الطلب بنجاح"}


@router.get("/audit-logs")
def get_audit_logs(
    user_id: str = Query(None),
    action: str = Query(None),
    start_date: str = Query(None),
    end_date: str = Query(None),
    limit: int = Query(100),
    offset: int = Query(0),
    current_user: dict = Depends(require_role("admin")),
    db: Session = Depends(get_db)
):
    """Get audit logs with filters."""
    query = db.query(AuditLog)
    
    if user_id:
        query = query.filter(AuditLog.user_id == user_id)
    if action:
        query = query.filter(AuditLog.action.ilike(f"%{action}%"))
    if start_date:
        query = query.filter(AuditLog.timestamp >= start_date)
    if end_date:
        query = query.filter(AuditLog.timestamp <= end_date)
    
    total = query.count()
    logs = query.order_by(AuditLog.timestamp.desc()).offset(offset).limit(limit).all()
    
    return {
        "total": total,
        "offset": offset,
        "limit": limit,
        "logs": [model_to_dict(log) for log in logs],
    }
