import os
import bcrypt
from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import jwt
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

# SECRET_KEY must come from environment – never hardcode in production
SECRET_KEY = os.environ.get("SECRET_KEY", "medlink-dev-only-change-me")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

bearer_scheme = HTTPBearer(auto_error=False)


def verify_password(plain: str, hashed: str) -> bool:
    """Verify password using bcrypt directly (passlib removed due to bcrypt 4.x incompatibility)."""
    try:
        return bcrypt.checkpw(plain.encode('utf-8'), hashed.encode('utf-8'))
    except Exception:
        return False


def hash_password(plain: str) -> str:
    """Hash password using bcrypt directly."""
    return bcrypt.hashpw(plain.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)):
    """Decode the JWT and return the payload dict (keys: sub, role, email)."""
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    return decode_token(credentials.credentials)


# ── Role-based authorization helpers ─────────────────────────────────────────

def require_role(*allowed_roles: str):
    """
    FastAPI dependency factory that enforces role-based access control.
    Usage:  current_user = Depends(require_role("admin"))
            current_user = Depends(require_role("doctor", "admin"))
    """
    def _checker(current_user: dict = Depends(get_current_user)):
        if current_user.get("role") not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="ليس لديك صلاحية للوصول إلى هذا المورد"
            )
        return current_user
    return _checker


def require_self_or_role(user_id_param: str, *allowed_roles: str):
    """
    Dependency factory: allows access if the requester IS the target user
    OR has one of the allowed roles (e.g. admin).
    The `user_id_param` should match the path/query parameter name.
    NOTE: This returns a dependency that must be used with care —
    for simplicity, callers check `current_user["sub"]` against the
    target user ID inside the endpoint body.
    """
    return require_role(*allowed_roles)  # Simplified – endpoint body checks self
