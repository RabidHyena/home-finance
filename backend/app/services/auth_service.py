import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
import jwt
from jwt.exceptions import PyJWTError
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import PasswordResetToken, User


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode('utf-8'), hashed.encode('utf-8'))


def create_access_token(user_id: int) -> str:
    settings = get_settings()
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=settings.access_token_expire_minutes)
    payload = {"sub": str(user_id), "exp": expire, "iat": now}
    return jwt.encode(payload, settings.secret_key, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> Optional[int]:
    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.jwt_algorithm])
        user_id = int(payload["sub"])
        return user_id
    except (PyJWTError, KeyError, ValueError):
        return None


def authenticate_user(db: Session, login: str, password: str) -> Optional[User]:
    user = get_user_by_email(db, login) or get_user_by_username(db, login)
    if not user or not verify_password(password, user.hashed_password):
        return None
    return user


def get_user_by_email(db: Session, email: str) -> Optional[User]:
    return db.query(User).filter(User.email == email).first()


def get_user_by_username(db: Session, username: str) -> Optional[User]:
    return db.query(User).filter(User.username == username).first()


def create_reset_token(db: Session, email: str) -> Optional[str]:
    """Create a password reset token. Returns raw hex token, or None if user not found.

    Uses flush() — caller owns the transaction boundary.
    """
    user = get_user_by_email(db, email)
    if not user:
        return None

    raw_token = secrets.token_hex(32)
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()

    # Invalidate any pending tokens for this user
    db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user.id,
        PasswordResetToken.used_at.is_(None),
    ).delete()

    expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
    db.add(PasswordResetToken(user_id=user.id, token_hash=token_hash, expires_at=expires_at))
    db.flush()
    return raw_token


def consume_reset_token(db: Session, raw_token: str, new_password: str) -> Optional[int]:
    """Validate token, update password, mark token used.

    Returns user_id on success, None on failure. Uses flush() — caller owns the commit.
    """
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    now = datetime.now(timezone.utc)

    token_obj = db.query(PasswordResetToken).filter(
        PasswordResetToken.token_hash == token_hash,
        PasswordResetToken.used_at.is_(None),
        PasswordResetToken.expires_at > now,
    ).first()

    if not token_obj:
        return None

    token_obj.used_at = now
    user = db.query(User).filter(User.id == token_obj.user_id).first()
    if not user:
        return None
    user.hashed_password = hash_password(new_password)
    db.flush()
    return user.id


def create_user(db: Session, email: str, username: str, password: str) -> User:
    """Create a user. Uses flush() — caller owns the transaction boundary."""
    user = User(
        email=email,
        username=username,
        hashed_password=hash_password(password),
    )
    db.add(user)
    db.flush()
    return user
