"""Admin tier and permission helpers for super admin / sub-admin accounts."""
from typing import Optional
from fastapi import HTTPException
from sqlalchemy.orm import Session

from models import User

ADMIN_PERMISSION_KEYS = [
    "dashboard_view",
    "users_view",
    "users_create",
    "users_edit",
    "users_verify",
    "users_toggle_active",
    "users_feature",
    "users_delete",
    "registrations_view",
    "registrations_approve",
    "registrations_reject",
    "logs_view",
    "sub_admins_manage",
]

ALL_ADMIN_PERMISSIONS = {k: True for k in ADMIN_PERMISSION_KEYS}

PERMISSION_LABELS_AR = {
    "dashboard_view": "عرض لوحة القيادة",
    "users_view": "عرض المستخدمين",
    "users_create": "إنشاء مستخدمين",
    "users_edit": "تعديل المستخدمين",
    "users_verify": "توثيق الحسابات",
    "users_toggle_active": "تفعيل وتعطيل الحسابات",
    "users_feature": "تمييز الأطباء والصيدليات",
    "users_delete": "تعطيل/حذف المستخدمين",
    "registrations_view": "عرض طلبات التسجيل",
    "registrations_approve": "الموافقة على التسجيل",
    "registrations_reject": "رفض طلبات التسجيل",
    "logs_view": "عرض سجل النشاط",
    "sub_admins_manage": "إدارة المدراء الفرعيين",
}


def normalize_permissions(raw: Optional[dict]) -> dict:
    if raw is None:
        return dict(ALL_ADMIN_PERMISSIONS)
    base = {k: False for k in ADMIN_PERMISSION_KEYS}
    for key in ADMIN_PERMISSION_KEYS:
        if key in raw:
            base[key] = bool(raw[key])
    return base


def parse_permissions_payload(data: Optional[dict]) -> dict:
    if not data:
        return {k: False for k in ADMIN_PERMISSION_KEYS}
    perms = data.get("permissions") or data.get("admin_permissions") or data
    if not isinstance(perms, dict):
        return {k: False for k in ADMIN_PERMISSION_KEYS}
    result = {k: False for k in ADMIN_PERMISSION_KEYS}
    for key in ADMIN_PERMISSION_KEYS:
        if key in perms:
            result[key] = bool(perms[key])
    return result


def get_admin_user(db: Session, user_id: str) -> Optional[User]:
    return db.query(User).filter(User.id == user_id, User.role == "admin").first()


def is_super_admin(admin: Optional[User]) -> bool:
    if not admin or admin.role != "admin":
        return False
    return (admin.admin_tier or "super_admin") == "super_admin"


def assert_not_protected_super_admin(user: User):
    """Block edit/delete/toggle on the main super admin account."""
    if is_super_admin(user):
        raise HTTPException(403, "لا يمكن تعديل أو تعطيل المدير الرئيسي")


def get_effective_permissions(admin: User) -> dict:
    if not admin or admin.role != "admin":
        return {}
    if is_super_admin(admin):
        return dict(ALL_ADMIN_PERMISSIONS)
    return normalize_permissions(admin.admin_permissions)


def admin_has_permission(db: Session, current_user: dict, permission: str) -> bool:
    if current_user.get("role") != "admin":
        return False
    admin = get_admin_user(db, current_user.get("sub"))
    if not admin:
        return False
    if is_super_admin(admin):
        return True
    return get_effective_permissions(admin).get(permission, False)


def require_admin_access(db: Session, current_user: dict):
    if current_user.get("role") != "admin":
        raise HTTPException(403, "ليس لديك صلاحية")


def require_admin_permission(db: Session, current_user: dict, permission: str):
    require_admin_access(db, current_user)
    if not admin_has_permission(db, current_user, permission):
        label = PERMISSION_LABELS_AR.get(permission, permission)
        raise HTTPException(403, f"ليس لديك صلاحية: {label}")


def require_super_admin(db: Session, current_user: dict):
    require_admin_access(db, current_user)
    admin = get_admin_user(db, current_user.get("sub"))
    if not is_super_admin(admin):
        raise HTTPException(403, "هذه العملية متاحة للمدير الرئيسي فقط")
