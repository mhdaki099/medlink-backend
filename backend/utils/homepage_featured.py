"""Homepage featured providers — limits and query helpers."""
from typing import List
from sqlalchemy.orm import Session

from models import User

HOMEPAGE_LIMITS = {
    "doctor": 3,
    "pharmacy": 4,
    "lab": 2,
    "radiology": 2,
}

HOMEPAGE_ROLE_LABELS_AR = {
    "doctor": "أطباء",
    "pharmacy": "صيدليات",
    "lab": "مختبرات",
    "radiology": "مراكز أشعة",
}

HOMEPAGE_ROLES = tuple(HOMEPAGE_LIMITS.keys())


def homepage_limit(role: str) -> int:
    return HOMEPAGE_LIMITS.get(role, 0)


def query_homepage_providers(db: Session, role: str) -> List[User]:
    limit = homepage_limit(role)
    if not limit:
        return []
    return (
        db.query(User)
        .filter(User.role == role, User.is_active == True, User.is_featured == True)
        .order_by(User.featured_sort_order.asc().nulls_last(), User.rating.desc().nulls_last(), User.name.asc())
        .limit(limit)
        .all()
    )


def apply_homepage_order(db: Session, role: str, ordered_ids: List[str]) -> int:
    """Set featured flags and sort order for a role. Returns count saved."""
    db.query(User).filter(User.role == role).update(
        {User.is_featured: False, User.featured_sort_order: None},
        synchronize_session=False,
    )
    saved = 0
    for idx, uid in enumerate(ordered_ids):
        user = db.query(User).filter(User.id == uid, User.role == role, User.is_active == True).first()
        if not user:
            continue
        user.is_featured = True
        user.featured_sort_order = idx
        saved += 1
    return saved
