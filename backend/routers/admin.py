import sys
import os

# Add the backend directory to Python path if running scripts directly
sys.path.append(os.path.dirname(os.path.abspath(__file__)) + "/..")

from fastapi import APIRouter, Query, HTTPException, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from db import get_db
from models import User, Appointment, Order, LabBooking, AuditLog, Medicine, LabTest, WarehouseInventory, RegistrationRequest

router = APIRouter()

def model_to_dict(model, exclude=None):
    if not model:
        return None
    exclude = exclude or []
    return {c.name: getattr(model, c.name) for c in model.__table__.columns if c.name not in exclude}

@router.get("/dashboard")
def get_dashboard(db: Session = Depends(get_db)):
    patients_count = db.query(User).filter(User.role == "patient").count()
    doctors_count = db.query(User).filter(User.role == "doctor").count()
    pharmacies_count = db.query(User).filter(User.role == "pharmacy").count()
    labs_count = db.query(User).filter(User.role == "lab").count()
    warehouses_count = db.query(User).filter(User.role == "warehouse").count()
    
    total_users = db.query(User).count()
    total_apts = db.query(Appointment).count()
    total_orders = db.query(Order).count()
    total_lab_bookings = db.query(LabBooking).count()
    
    pending_verifications = db.query(User).filter(User.verified == False).count()
    recent_activity = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(10).all()
    
    # Last 7 days appointments for chart
    from datetime import datetime, timedelta
    seven_days_ago = (datetime.utcnow() - timedelta(days=7)).isoformat()
    daily_apts = db.query(
        func.substr(Appointment.created_at, 1, 10).label('date'),
        func.count(Appointment.id)
    ).filter(Appointment.created_at >= seven_days_ago).group_by('date').all()
    
    daily_apts_data = {d: c for d, c in daily_apts}

    return {
        "total_users": total_users,
        "patients": patients_count,
        "doctors": doctors_count,
        "pharmacies": pharmacies_count,
        "labs": labs_count,
        "warehouses": warehouses_count,
        "total_appointments": total_apts,
        "total_orders": total_orders,
        "total_lab_bookings": total_lab_bookings,
        "pending_verifications": pending_verifications,
        "recent_activity": [model_to_dict(a) for a in recent_activity],
        "daily_appointments": daily_apts_data,
    }

@router.get("/users")
def list_all_users(role: str = Query(None), db: Session = Depends(get_db)):
    query = db.query(User)
    if role:
        query = query.filter(User.role == role)
    users = query.all()
    return [model_to_dict(u, ["password"]) for u in users]

@router.post("/users")
def create_user(req: dict, db: Session = Depends(get_db)):
    from auth_utils import hash_password
    import uuid
    from datetime import datetime
    
    existing_email = db.query(User).filter(User.email == req.get("email")).first()
    if existing_email:
        raise HTTPException(status_code=400, detail="البريد الإلكتروني مستخدم مسبقاً")
        
    if req.get("phone"):
        existing_phone = db.query(User).filter(User.phone == req.get("phone")).first()
        if existing_phone:
            raise HTTPException(status_code=400, detail="رقم الهاتف مستخدم مسبقاً")
            
    new_id = f"new_{uuid.uuid4().hex[:8]}"
    role = req.get("role", "patient")
    # For simplicity, assign default photo
    photo = ""
    if role == 'doctor':
        photo = "/assets/doctors_sample/doctor male 3.png"
        
    password = req.get("password") or "123456"
        
    new_user = User(
        id=new_id,
        role=role,
        name=req.get("name", "").strip(),
        email=req.get("email"),
        password=hash_password(password),
        phone=req.get("phone", ""),
        city=req.get("city", ""),
        photo=photo,
        specialization=req.get("specialization") if role == 'doctor' else None,
        is_active=True,
        verified=True, # Admin created users are verified automatically
        created_at=datetime.utcnow().isoformat()
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return model_to_dict(new_user, ["password"])

@router.put("/users/{user_id}/verify")
def verify_user(user_id: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "المستخدم غير موجود")
        
    user.verified = True
    db.commit()
    db.refresh(user)
    return model_to_dict(user, ["password"])

@router.put("/users/{user_id}/toggle-active")
def toggle_active(user_id: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "المستخدم غير موجود")
        
    user.is_active = not user.is_active
    db.commit()
    db.refresh(user)
    return model_to_dict(user, ["password"])

@router.put("/users/{user_id}/toggle-featured")
def toggle_featured(user_id: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "المستخدم غير موجود")
        
    user.is_featured = not user.is_featured
    db.commit()
    db.refresh(user)
    return model_to_dict(user, ["password"])

@router.delete("/users/{user_id}")
def delete_user(user_id: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if user:
        db.delete(user)
        db.commit()
    return {"message": "تم حذف المستخدم"}

@router.get("/audit-logs")
def get_audit_logs(db: Session = Depends(get_db)):
    logs = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).all()
    return [model_to_dict(l) for l in logs]

@router.get("/stats")
def get_stats(db: Session = Depends(get_db)):
    apts_by_status_query = db.query(Appointment.status, func.count(Appointment.id)).group_by(Appointment.status).all()
    appointments_by_status = {status: count for status, count in apts_by_status_query}

    orders_by_status_query = db.query(Order.status, func.count(Order.id)).group_by(Order.status).all()
    orders_by_status = {status: count for status, count in orders_by_status_query}

    return {
        "appointments_by_status": appointments_by_status,
        "orders_by_status": orders_by_status,
        "medicines_count": db.query(Medicine).count(),
        "lab_tests_count": db.query(LabTest).count(),
        "warehouse_items_count": db.query(WarehouseInventory).count(),
    }

@router.get("/registration-requests")
def list_registration_requests(db: Session = Depends(get_db)):
    requests = db.query(RegistrationRequest).filter(RegistrationRequest.status == "pending").all()
    # Data is JSON, so it's already a dict
    return [
        {
            "id": r.id,
            "role": r.role,
            "email": r.email,
            "data": r.data,
            "created_at": r.created_at
        } for r in requests
    ]

@router.post("/registration-requests/{request_id}/approve")
def approve_registration(request_id: str, db: Session = Depends(get_db)):
    from auth_utils import hash_password
    import uuid
    from datetime import datetime

    req = db.query(RegistrationRequest).filter(RegistrationRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    
    if req.status != "pending":
        raise HTTPException(status_code=400, detail="الطلب تمت معالجته مسبقاً")

    data = req.data
    # Create the user
    new_user = User(
        id=f"{req.role[0]}_{uuid.uuid4().hex[:8]}", # e.g. d_... or ph_...
        role=req.role,
        name=f"{data.get('first_name', '')} {data.get('last_name', '')}".strip(),
        email=req.email,
        password=data.get('password'), 
        phone=data.get('phone', ''),
        city=data.get('city', ''),
        photo=data.get('photo', ''),
        clinic_name=data.get('clinic_name') if req.role == 'doctor' else None,
        clinic_address=data.get('clinic_address') if req.role == 'doctor' else None,
        price_per_session=data.get('price_per_session') if req.role == 'doctor' else None,
        available_hours=data.get('available_hours') if req.role == 'doctor' else None,
        specialization=data.get('specialization') if req.role == 'doctor' else None,
        is_active=True,
        verified=True,
        created_at=datetime.utcnow().isoformat()
    )
    
    # Re-hash password if it's plain in data
    if "password" in data:
         new_user.password = hash_password(data["password"])

    db.add(new_user)
    req.status = "approved"
    db.commit()
    
    return {"message": "تمت الموافقة على الحساب وتفعيله بنجاح"}

@router.post("/registration-requests/{request_id}/reject")
def reject_registration(request_id: str, db: Session = Depends(get_db)):
    req = db.query(RegistrationRequest).filter(RegistrationRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    
    req.status = "rejected"
    db.commit()
    return {"message": "تم رفض طلب التسجيل"}
    db.commit()
    return {"message": "تم رفض طلب التسجيل"}
