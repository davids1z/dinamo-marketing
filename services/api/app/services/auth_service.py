"""Authentication service: password hashing and JWT token management."""

from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24


def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.APP_SECRET_KEY, algorithm=ALGORITHM)


def verify_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, settings.APP_SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None


# --- Invite tokens ---

INVITE_TOKEN_EXPIRE_HOURS = 72


def create_invite_token(client_id: str, role: str, inviter_email: str) -> str:
    """Create a JWT invite token that expires in 72 hours."""
    to_encode = {
        "type": "invite",
        "client_id": client_id,
        "role": role,
        "inviter": inviter_email,
    }
    expire = datetime.now(timezone.utc) + timedelta(hours=INVITE_TOKEN_EXPIRE_HOURS)
    to_encode["exp"] = expire
    return jwt.encode(to_encode, settings.APP_SECRET_KEY, algorithm=ALGORITHM)


def verify_invite_token(token: str) -> dict | None:
    """Verify an invite token. Returns payload dict or None if invalid."""
    try:
        payload = jwt.decode(token, settings.APP_SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "invite":
            return None
        return payload
    except JWTError:
        return None
