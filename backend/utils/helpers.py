"""Shared utilities used across all routers."""


def model_to_dict(model, exclude=None):
    """Convert a SQLAlchemy model instance to a plain dict, optionally excluding fields."""
    if not model:
        return None
    exclude = exclude or []
    return {c.name: getattr(model, c.name) for c in model.__table__.columns if c.name not in exclude}


# Fields that can NEVER be set via generic update endpoints
PROTECTED_FIELDS = frozenset({
    "id", "role", "password", "is_active", "verified", "is_featured",
    "created_at", "supervisor_id",
})


def safe_update(model_instance, updates: dict, extra_blocked: set | None = None):
    """
    Apply only whitelisted fields from `updates` to the model instance.
    Silently skips protected fields and non-existent attributes.
    Returns the set of field names that were actually updated.
    """
    blocked = PROTECTED_FIELDS | (extra_blocked or set())
    changed = set()
    for key, value in updates.items():
        if key in blocked:
            continue
        if hasattr(model_instance, key):
            setattr(model_instance, key, value)
            changed.add(key)
    return changed
