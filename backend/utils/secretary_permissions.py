"""Secretary permission keys and helpers."""
from typing import Optional, Dict, List
from fastapi import HTTPException
from sqlalchemy.orm import Session

from models import User

SECRETARY_PERMISSION_KEYS = [
    "appointments_accept",
    "appointments_reject",
    "appointments_create",
    "appointments_edit",
    "appointments_remove",
    "appointments_respond",
    "reports_view",
    "reports_edit",
    "history_view",
    "history_request",
    "prescriptions_view",
    "prescriptions_create",
    "notes_view",
    "notes_create",
    "analysis_view",
    "photos_view",
    "call_patient",
    "clinic_edit",
]

SECRETARY_CLINIC_FIELDS = frozenset({
    "clinic_name",
    "clinic_address",
    "phone",
    "available_hours",
    "working_hours",
    "consultation_duration",
    "buffer_minutes",
})

ALL_SECRETARY_PERMISSIONS = {k: True for k in SECRETARY_PERMISSION_KEYS}

PERMISSION_LABELS_AR = {
    "appointments_accept": "تأكيد المواعيد",
    "appointments_reject": "رفض المواعيد",
    "appointments_create": "إنشاء مواعيد",
    "appointments_edit": "تعديل وإعادة الجدولة",
    "appointments_remove": "إلغاء المواعيد",
    "appointments_respond": "الرد على طلبات المريض",
    "reports_view": "عرض التقارير",
    "reports_edit": "تعديل التقارير وإنهاء الجلسات",
    "history_view": "عرض السجل والزيارات",
    "history_request": "طلب الوصول للسجل",
    "prescriptions_view": "عرض الوصفات",
    "prescriptions_create": "إصدار وصفات",
    "notes_view": "عرض الملاحظات",
    "notes_create": "إضافة ملاحظات",
    "analysis_view": "عرض التحاليل والأشعة",
    "photos_view": "عرض الصور والمرفقات",
    "call_patient": "الاتصال بالمريض",
    "clinic_edit": "تعديل معلومات العيادة وساعات العمل",
}


def normalize_permissions(raw: Optional[dict]) -> dict:
    """Merge stored permissions with defaults (missing keys = False when explicitly set)."""
    if raw is None:
        return dict(ALL_SECRETARY_PERMISSIONS)
    base = {k: False for k in SECRETARY_PERMISSION_KEYS}
    for key in SECRETARY_PERMISSION_KEYS:
        if key in raw:
            base[key] = bool(raw[key])
    return base


def parse_permissions_payload(data: Optional[dict]) -> dict:
    if not data:
        return dict(ALL_SECRETARY_PERMISSIONS)
    perms = data.get("permissions") or data.get("secretary_permissions") or data
    if not isinstance(perms, dict):
        return dict(ALL_SECRETARY_PERMISSIONS)
    result = {k: False for k in SECRETARY_PERMISSION_KEYS}
    for key in SECRETARY_PERMISSION_KEYS:
        if key in perms:
            result[key] = bool(perms[key])
    return result


def get_secretary_user(db: Session, user_id: str) -> Optional[User]:
    return db.query(User).filter(User.id == user_id, User.role == "secretary").first()


def get_effective_permissions(sec: User) -> dict:
    if not sec or sec.role != "secretary":
        return {}
    return normalize_permissions(sec.secretary_permissions)


def secretary_has_permission(db: Session, current_user: dict, permission: str) -> bool:
    if current_user.get("role") != "secretary":
        return True
    sec = get_secretary_user(db, current_user.get("sub"))
    if not sec:
        return False
    return get_effective_permissions(sec).get(permission, False)


def require_secretary_permission(db: Session, current_user: dict, permission: str):
    if current_user.get("role") == "secretary" and not secretary_has_permission(db, current_user, permission):
        label = PERMISSION_LABELS_AR.get(permission, permission)
        raise HTTPException(status_code=403, detail=f"ليس لديك صلاحية: {label}")


def filter_visits_for_secretary(visits: List[dict], permissions: dict) -> List[dict]:
    filtered = []
    for visit in visits:
        v = dict(visit)
        if v.get("type") == "medical_record":
            if not permissions.get("photos_view"):
                continue
            filtered.append(v)
            continue
        if not permissions.get("reports_view"):
            v["consultation_report"] = None
            v["follow_up"] = ""
        if not permissions.get("prescriptions_view"):
            v["prescription"] = None
        if not permissions.get("analysis_view"):
            v["service_requests"] = []
        if not permissions.get("notes_view"):
            v["notes"] = []
        filtered.append(v)
    return filtered
