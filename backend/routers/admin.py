"""
Admin router - full account management, audit logs, and dashboard.
"""
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta
import uuid

from db import get_db
from models import (
    User, RegistrationRequest, Appointment, AuditLog,
    ServiceBooking, Order, Prescription, MedicalRecord,
)
from auth_utils import get_current_user, hash_password
from utils.helpers import model_to_dict
from utils.homepage_featured import (
    HOMEPAGE_LIMITS,
    HOMEPAGE_ROLE_LABELS_AR,
    HOMEPAGE_ROLES,
    apply_homepage_order,
)
from utils.admin_permissions import (
    require_admin_permission,
    require_super_admin,
    require_admin_access,
    get_admin_user,
    is_super_admin,
    assert_not_protected_super_admin,
    get_effective_permissions,
    parse_permissions_payload,
    ALL_ADMIN_PERMISSIONS,
    ADMIN_PERMISSION_KEYS,
)

router = APIRouter()

ALL_ROLES = [
    "patient", "doctor", "pharmacy", "lab", "radiology",
    "warehouse", "secretary", "admin",
]

ADMIN_USER_FIELDS = frozenset({
    "name", "name_en", "email", "phone", "role", "city", "country", "address",
    "province", "district", "area", "gender", "dob", "photo",
    "specialization", "specialization_en", "clinic_name", "clinic_address",
    "price_per_session", "experience_years", "available_hours", "working_hours",
    "open_hours", "license_no", "association_no", "supervisor_id",
    "consultation_duration", "buffer_minutes", "verified", "is_active",
    "is_featured", "featured_sort_order", "has_home_service", "home_service_fee",
    "rating", "total_reviews",
})


def _log_admin_action(db: Session, admin_id: str, action: str, details: str = ""):
    db.add(AuditLog(
        id=f"al_{uuid.uuid4().hex[:10]}",
        user_id=admin_id,
        action=action,
        details=details,
        timestamp=datetime.now(timezone.utc).isoformat(),
    ))


def _apply_user_fields(user: User, data: dict, *, allow_password: bool = False):
    if allow_password and data.get("password"):
        user.password = hash_password(data["password"])
    for key, value in data.items():
        if key == "password":
            continue
        if key in ADMIN_USER_FIELDS and hasattr(user, key):
            setattr(user, key, value)


def _count_users(db: Session, role: str) -> int:
    return db.query(User).filter(User.role == role, User.is_active == True).count()


@router.get("/dashboard")
def get_dashboard_stats(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    require_admin_permission(db, current_user, "dashboard_view")
    """Get admin dashboard statistics."""
    user_counts = {role: _count_users(db, role) for role in ALL_ROLES}
    total_users = db.query(User).filter(User.is_active == True).count()
    pending_count = db.query(RegistrationRequest).filter(RegistrationRequest.status == "pending").count()

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    today_appointments = db.query(Appointment).filter(Appointment.date == today).count()
    total_appointments = db.query(Appointment).count()

    daily_appointments = {}
    for i in range(6, -1, -1):
        day = (datetime.now(timezone.utc) - timedelta(days=i)).strftime("%Y-%m-%d")
        daily_appointments[day] = db.query(Appointment).filter(Appointment.date == day).count()

    recent_logs = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(10).all()

    return {
        "total_users": total_users,
        "patients": user_counts.get("patient", 0),
        "doctors": user_counts.get("doctor", 0),
        "pharmacies": user_counts.get("pharmacy", 0),
        "labs": user_counts.get("lab", 0),
        "radiology": user_counts.get("radiology", 0),
        "warehouses": user_counts.get("warehouse", 0),
        "secretaries": user_counts.get("secretary", 0),
        "admins": user_counts.get("admin", 0),
        "user_counts": user_counts,
        "pending_registrations": pending_count,
        "today_appointments": today_appointments,
        "total_appointments": total_appointments,
        "total_orders": db.query(Order).count(),
        "total_prescriptions": db.query(Prescription).count(),
        "total_service_bookings": db.query(ServiceBooking).count(),
        "total_medical_records": db.query(MedicalRecord).count(),
        "inactive_users": db.query(User).filter(User.is_active == False).count(),
        "unverified_users": db.query(User).filter(User.verified == False, User.is_active == True).count(),
        "daily_appointments": daily_appointments,
        "recent_activity": [model_to_dict(log) for log in recent_logs],
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/users")
def list_users(
    role: str = Query(None),
    verified: bool = Query(None),
    search: str = Query(None),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_admin_permission(db, current_user, "users_view")
    """List all users with optional filters."""
    query = db.query(User)
    caller = get_admin_user(db, current_user["sub"])
    if caller and not is_super_admin(caller):
        query = query.filter(User.role != "admin")

    if role:
        query = query.filter(User.role == role)
    if verified is not None:
        query = query.filter(User.verified == verified)
    if search:
        query = query.filter(
            (User.name.ilike(f"%{search}%")) |
            (User.email.ilike(f"%{search}%")) |
            (User.phone.ilike(f"%{search}%")) |
            (User.city.ilike(f"%{search}%")) |
            (User.country.ilike(f"%{search}%"))
        )

    users = query.order_by(User.created_at.desc()).all()
    result = []
    for u in users:
        row = model_to_dict(u, ["password"])
        if u.role == "admin":
            row["is_super_admin"] = is_super_admin(u)
        result.append(row)
    return result


@router.post("/users")
def create_user(
    data: dict,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_admin_permission(db, current_user, "users_create")
    """Create a new user from admin panel."""
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    role = data.get("role", "patient")

    if not name or not email:
        raise HTTPException(400, "الاسم والبريد الإلكتروني مطلوبان")
    if role not in ALL_ROLES:
        raise HTTPException(400, "دور غير صالح")
    if role == "admin":
        raise HTTPException(403, "إنشاء حسابات المدراء يتم من قسم المدراء الفرعيين فقط")
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(400, "البريد الإلكتروني مستخدم مسبقاً")

    if role == "secretary" and not data.get("supervisor_id"):
        raise HTTPException(400, "يجب تحديد الطبيب المشرف للسكرتارية")

    prefix = role[0] if role != "radiology" else "r"
    if role == "secretary":
        prefix = "sec"
    elif role == "warehouse":
        prefix = "w"
    elif role == "pharmacy":
        prefix = "ph"
    elif role == "patient":
        prefix = "p"
    elif role == "doctor":
        prefix = "d"
    elif role == "admin":
        prefix = "adm"

    new_id = f"{prefix}_{uuid.uuid4().hex[:8]}"
    password = data.get("password") or "123456"

    new_user = User(
        id=new_id,
        role=role,
        name=name,
        email=email,
        password=hash_password(password),
        phone=data.get("phone", ""),
        city=data.get("city", ""),
        country=data.get("country", "سوريا"),
        address=data.get("address", ""),
        province=data.get("province", ""),
        district=data.get("district", ""),
        area=data.get("area", ""),
        gender=data.get("gender"),
        dob=data.get("dob"),
        is_active=True,
        verified=bool(data.get("verified", True)),
        created_at=datetime.now(timezone.utc).isoformat(),
    )
    _apply_user_fields(new_user, data)

    db.add(new_user)
    _log_admin_action(db, current_user["sub"], "admin_create_user", f"Created {role} {new_id} ({email})")
    db.commit()
    db.refresh(new_user)
    return model_to_dict(new_user, ["password"])


@router.get("/users/{user_id}")
def get_user_detail(
    user_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_admin_permission(db, current_user, "users_view")
    """Get detailed user information."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "المستخدم غير موجود")

    result = model_to_dict(user, ["password"])
    if user.role == "admin":
        result["is_super_admin"] = is_super_admin(user)

    if user.role == "patient":
        result["appointment_count"] = db.query(Appointment).filter(Appointment.patient_id == user_id).count()
    elif user.role == "doctor":
        result["appointment_count"] = db.query(Appointment).filter(Appointment.doctor_id == user_id).count()
    elif user.role == "secretary" and user.supervisor_id:
        supervisor = db.query(User).filter(User.id == user.supervisor_id).first()
        if supervisor:
            result["supervisor_name"] = supervisor.name

    return result


@router.put("/users/{user_id}")
def update_user(
    user_id: str,
    updates: dict,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_admin_permission(db, current_user, "users_edit")
    """Update user information."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "المستخدم غير موجود")

    assert_not_protected_super_admin(user)

    if user.role == "admin":
        require_super_admin(db, current_user)
        updates = {k: v for k, v in updates.items() if k not in ("admin_tier", "created_by_admin_id")}
        if "admin_permissions" in updates:
            updates["admin_permissions"] = parse_permissions_payload(updates)

    if updates.get("email"):
        existing = db.query(User).filter(User.email == updates["email"], User.id != user_id).first()
        if existing:
            raise HTTPException(400, "البريد الإلكتروني مستخدم مسبقاً")

    _apply_user_fields(user, updates, allow_password=True)
    _log_admin_action(db, current_user["sub"], "admin_update_user", f"Updated {user_id}")
    db.commit()
    db.refresh(user)
    return model_to_dict(user, ["password"])


@router.put("/users/{user_id}/verify")
def verify_user(
    user_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_admin_permission(db, current_user, "users_verify")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "المستخدم غير موجود")
    user.verified = True
    _log_admin_action(db, current_user["sub"], "admin_verify_user", user_id)
    db.commit()
    return model_to_dict(user, ["password"])


@router.put("/users/{user_id}/toggle-active")
def toggle_user_active(
    user_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_admin_permission(db, current_user, "users_toggle_active")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "المستخدم غير موجود")
    assert_not_protected_super_admin(user)
    user.is_active = not user.is_active
    action = "admin_activate_user" if user.is_active else "admin_deactivate_user"
    _log_admin_action(db, current_user["sub"], action, user_id)
    db.commit()
    return model_to_dict(user, ["password"])


@router.put("/users/{user_id}/toggle-featured")
def toggle_user_featured(
    user_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_admin_permission(db, current_user, "users_feature")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "المستخدم غير موجود")
    if user.role not in HOMEPAGE_ROLES:
        raise HTTPException(400, "التمييز متاح للأطباء والصيدليات والمختبرات ومراكز الأشعة فقط")
    if not user.is_featured:
        current_count = db.query(User).filter(User.role == user.role, User.is_featured == True).count()
        if current_count >= HOMEPAGE_LIMITS.get(user.role, 0):
            raise HTTPException(400, f"الحد الأقصى {HOMEPAGE_LIMITS[user.role]} — أزل عنصراً من الصفحة الرئيسية أولاً")
        user.is_featured = True
        user.featured_sort_order = current_count
    else:
        user.is_featured = False
        user.featured_sort_order = None
        remaining = (
            db.query(User)
            .filter(User.role == user.role, User.is_featured == True, User.id != user_id)
            .order_by(User.featured_sort_order.asc().nulls_last())
            .all()
        )
        for idx, row in enumerate(remaining):
            row.featured_sort_order = idx
    _log_admin_action(db, current_user["sub"], "admin_toggle_featured", f"{user_id} -> {user.is_featured}")
    db.commit()
    return model_to_dict(user, ["password"])


@router.get("/homepage-featured")
def get_homepage_featured(
    role: str = Query(...),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_admin_permission(db, current_user, "users_feature")
    if role not in HOMEPAGE_ROLES:
        raise HTTPException(400, "نوع غير مدعوم")
    limit = HOMEPAGE_LIMITS[role]
    base = db.query(User).filter(User.role == role, User.is_active == True)
    featured = (
        base.filter(User.is_featured == True)
        .order_by(User.featured_sort_order.asc().nulls_last(), User.name.asc())
        .all()
    )
    featured_ids = {u.id for u in featured}
    available_query = base
    if featured_ids:
        available_query = available_query.filter(~User.id.in_(featured_ids))
    available = available_query.order_by(User.name.asc()).all()
    return {
        "role": role,
        "role_label": HOMEPAGE_ROLE_LABELS_AR[role],
        "limit": limit,
        "count": len(featured),
        "featured": [model_to_dict(u, ["password"]) for u in featured],
        "available": [model_to_dict(u, ["password"]) for u in available],
    }


@router.put("/homepage-featured")
def update_homepage_featured(
    data: dict,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_admin_permission(db, current_user, "users_feature")
    role = data.get("role")
    ordered_ids = data.get("ordered_ids") or []
    if role not in HOMEPAGE_ROLES:
        raise HTTPException(400, "نوع غير مدعوم")
    limit = HOMEPAGE_LIMITS[role]
    if len(ordered_ids) > limit:
        raise HTTPException(400, f"الحد الأقصى {limit} عناصر")
    if len(ordered_ids) != len(set(ordered_ids)):
        raise HTTPException(400, "قائمة مكررة")
    saved = apply_homepage_order(db, role, ordered_ids)
    _log_admin_action(
        db, current_user["sub"], "admin_homepage_featured",
        f"{role}: {ordered_ids}",
    )
    db.commit()
    return {"message": "تم حفظ عرض الصفحة الرئيسية", "count": saved, "limit": limit}


@router.delete("/users/{user_id}")
def delete_user(
    user_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_admin_permission(db, current_user, "users_delete")
    """Soft delete a user by setting is_active to False."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "المستخدم غير موجود")
    assert_not_protected_super_admin(user)
    if user.role == "admin":
        raise HTTPException(403, "لا يمكن تعطيل حسابات المدراء من هنا — استخدم قسم المدراء الفرعيين")

    user.is_active = False
    _log_admin_action(db, current_user["sub"], "admin_delete_user", user_id)
    db.commit()
    return {"message": "تم تعطيل المستخدم بنجاح"}


@router.get("/registrations")
@router.get("/registration-requests")
def list_registration_requests(
    status: str = Query(None),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_admin_permission(db, current_user, "registrations_view")
    """List registration requests."""
    query = db.query(RegistrationRequest)
    if status:
        query = query.filter(RegistrationRequest.status == status)
    requests = query.order_by(RegistrationRequest.created_at.desc()).all()
    return [model_to_dict(r) for r in requests]


@router.post("/registrations/{request_id}/approve")
@router.post("/registration-requests/{request_id}/approve")
def approve_registration(
    request_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_admin_permission(db, current_user, "registrations_approve")
    """Approve a registration request and create the user."""
    req = db.query(RegistrationRequest).filter(RegistrationRequest.id == request_id).first()
    if not req:
        raise HTTPException(404, "الطلب غير موجود")
    if req.status != "pending":
        raise HTTPException(400, "الطلب ليس في حالة معلقة")

    data = req.data or {}
    role = req.role

    if db.query(User).filter(User.email == req.email).first():
        raise HTTPException(400, "البريد الإلكتروني مستخدم مسبقاً")

    prefix_map = {
        "doctor": "d", "pharmacy": "ph", "lab": "l", "radiology": "r",
        "warehouse": "w", "patient": "p", "secretary": "sec",
    }
    new_id = f"{prefix_map.get(role, role[0])}_{uuid.uuid4().hex[:8]}"
    full_name = f"{data.get('first_name', '')} {data.get('last_name', '')}".strip() or data.get("name", "")

    new_user = User(
        id=new_id,
        role=role,
        name=full_name,
        email=req.email,
        password=data.get("password", ""),
        phone=data.get("phone", ""),
        city=data.get("city", data.get("province", "")),
        country=data.get("country", "سوريا"),
        province=data.get("province", ""),
        district=data.get("district", ""),
        area=data.get("area", ""),
        address=data.get("address", ""),
        photo=data.get("photo", ""),
        is_active=True,
        verified=True,
        created_at=datetime.now(timezone.utc).isoformat(),
        specialization=data.get("specialization", ""),
        specialization_en=data.get("specialization_en", ""),
        clinic_name=data.get("clinic_name", ""),
        clinic_address=data.get("clinic_address", ""),
        price_per_session=data.get("price_per_session", 0),
        experience_years=data.get("experience_years", 0),
        available_hours=data.get("available_hours", ""),
        working_hours=data.get("working_hours", {}),
        consultation_duration=data.get("consultation_duration", 30),
        buffer_minutes=data.get("buffer_minutes", 10),
        open_hours=data.get("open_hours", ""),
        license_no=data.get("license_no", ""),
        association_no=data.get("association_no", ""),
        documents=data.get("documents", []),
        lat=data.get("lat"),
        lng=data.get("lng"),
    )

    db.add(new_user)
    req.status = "approved"
    _log_admin_action(db, current_user["sub"], "admin_approve_registration", f"{request_id} -> {new_id}")
    db.commit()

    return {
        "message": "تمت الموافقة على الطلب بنجاح",
        "user_id": new_id,
    }


@router.post("/registrations/{request_id}/reject")
@router.post("/registration-requests/{request_id}/reject")
def reject_registration(
    request_id: str,
    reason: Optional[dict] = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_admin_permission(db, current_user, "registrations_reject")
    """Reject a registration request."""
    req = db.query(RegistrationRequest).filter(RegistrationRequest.id == request_id).first()
    if not req:
        raise HTTPException(404, "الطلب غير موجود")
    if req.status != "pending":
        raise HTTPException(400, "الطلب ليس في حالة معلقة")

    req.status = "rejected"
    rejection_reason = (reason or {}).get("reason", "")
    _log_admin_action(
        db, current_user["sub"], "admin_reject_registration",
        f"{request_id}: {rejection_reason}" if rejection_reason else request_id,
    )
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
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_admin_permission(db, current_user, "logs_view")
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


def _admin_public_dict(admin: User) -> dict:
    data = model_to_dict(admin, ["password"])
    data["admin_permissions"] = get_effective_permissions(admin)
    data["is_super_admin"] = is_super_admin(admin)
    return data


@router.get("/me")
def get_admin_profile(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    require_admin_access(db, current_user)
    admin = get_admin_user(db, current_user["sub"])
    if not admin:
        raise HTTPException(404, "حساب المدير غير موجود")
    return _admin_public_dict(admin)


@router.get("/sub-admins")
def list_sub_admins(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    require_super_admin(db, current_user)
    admins = db.query(User).filter(
        User.role == "admin",
        User.admin_tier == "sub_admin",
    ).order_by(User.created_at.desc()).all()
    return [_admin_public_dict(a) for a in admins]


@router.post("/sub-admins")
def create_sub_admin(
    data: dict,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_super_admin(db, current_user)
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    if not name or not email:
        raise HTTPException(400, "الاسم والبريد الإلكتروني مطلوبان")
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(400, "البريد الإلكتروني مستخدم مسبقاً")

    permissions = parse_permissions_payload(data)
    if not any(permissions.values()):
        raise HTTPException(400, "يجب تحديد صلاحية واحدة على الأقل")

    new_id = f"adm_{uuid.uuid4().hex[:8]}"
    password = data.get("password") or "123456"
    admin = User(
        id=new_id,
        role="admin",
        name=name,
        email=email,
        password=hash_password(password),
        phone=data.get("phone", ""),
        city=data.get("city", "دمشق"),
        country=data.get("country", "سوريا"),
        admin_tier="sub_admin",
        admin_permissions=permissions,
        created_by_admin_id=current_user["sub"],
        is_active=True,
        verified=True,
        created_at=datetime.now(timezone.utc).isoformat(),
    )
    db.add(admin)
    _log_admin_action(db, current_user["sub"], "admin_create_sub_admin", f"{new_id} ({email})")
    db.commit()
    db.refresh(admin)
    return _admin_public_dict(admin)


@router.put("/sub-admins/{admin_id}")
def update_sub_admin(
    admin_id: str,
    data: dict,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_super_admin(db, current_user)
    admin = db.query(User).filter(User.id == admin_id, User.role == "admin").first()
    if not admin:
        raise HTTPException(404, "المدير غير موجود")
    if is_super_admin(admin):
        raise HTTPException(403, "لا يمكن تعديل المدير الرئيسي من هنا")

    if data.get("name"):
        admin.name = data["name"].strip()
    if data.get("email"):
        email = data["email"].strip().lower()
        if db.query(User).filter(User.email == email, User.id != admin_id).first():
            raise HTTPException(400, "البريد الإلكتروني مستخدم مسبقاً")
        admin.email = email
    if data.get("phone") is not None:
        admin.phone = data["phone"]
    if data.get("password"):
        admin.password = hash_password(data["password"])
    if "permissions" in data or "admin_permissions" in data:
        perms = parse_permissions_payload(data)
        if not any(perms.values()):
            raise HTTPException(400, "يجب تحديد صلاحية واحدة على الأقل")
        admin.admin_permissions = perms
    if "is_active" in data:
        admin.is_active = bool(data["is_active"])

    _log_admin_action(db, current_user["sub"], "admin_update_sub_admin", admin_id)
    db.commit()
    db.refresh(admin)
    return _admin_public_dict(admin)


@router.delete("/sub-admins/{admin_id}")
def deactivate_sub_admin(
    admin_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_super_admin(db, current_user)
    admin = db.query(User).filter(User.id == admin_id, User.role == "admin").first()
    if not admin:
        raise HTTPException(404, "المدير غير موجود")
    if is_super_admin(admin):
        raise HTTPException(403, "لا يمكن تعطيل المدير الرئيسي")
    admin.is_active = False
    _log_admin_action(db, current_user["sub"], "admin_deactivate_sub_admin", admin_id)
    db.commit()
    return {"message": "تم تعطيل المدير الفرعي"}
