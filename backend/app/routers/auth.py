import logging
import secrets
import threading
import time

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.dependencies import get_current_user
from app.models import User
from app.rate_limiter import RateLimiter
from app.schemas_auth import ForgotPasswordRequest, ResetPasswordRequest, UserLogin, UserRegister, UserResponse
from app.services.audit_service import log_audit
from app.services.auth_service import (
    consume_reset_token,
    create_access_token,
    create_reset_token,
    create_user,
    get_user_by_email,
    get_user_by_username,
    verify_password,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["auth"])

settings = get_settings()
_auth_limiter = RateLimiter(
    window=settings.rate_limit_window,
    max_requests=settings.rate_limit_max_requests,
)

# Brute force protection: track failed login attempts per login key
_MAX_FAILED_ATTEMPTS = 5
_LOCKOUT_DURATION = 900  # 15 minutes
_failed_logins: dict[str, list[float]] = {}
_failed_logins_lock = threading.Lock()


def _check_brute_force(login_key: str) -> None:
    """Block login if too many recent failures for this account."""
    now = time.time()
    with _failed_logins_lock:
        attempts = _failed_logins.get(login_key, [])
        # Keep only attempts within lockout window
        attempts = [t for t in attempts if now - t < _LOCKOUT_DURATION]
        _failed_logins[login_key] = attempts

        if len(attempts) >= _MAX_FAILED_ATTEMPTS:
            logger.warning("Account locked due to brute force: %s", login_key)
            raise HTTPException(
                status_code=429,
                detail="Too many failed login attempts. Please try again later.",
                headers={"Retry-After": str(_LOCKOUT_DURATION)},
            )


def _record_failed_login(login_key: str) -> None:
    """Record a failed login attempt."""
    with _failed_logins_lock:
        _failed_logins.setdefault(login_key, []).append(time.time())


def _clear_failed_logins(login_key: str) -> None:
    """Clear failed attempts on successful login."""
    with _failed_logins_lock:
        _failed_logins.pop(login_key, None)


def _set_token_cookie(response: Response, token: str) -> None:
    settings = get_settings()
    response.set_cookie(
        key=settings.cookie_name,
        value=token,
        httponly=True,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
        max_age=settings.access_token_expire_minutes * 60,
        path="/",
    )


@router.post("/register", response_model=UserResponse, status_code=201)
def register(data: UserRegister, response: Response, request: Request, db: Session = Depends(get_db)):
    _auth_limiter.check(request.client.host if request.client else "unknown")
    if get_user_by_email(db, data.email) or get_user_by_username(db, data.username):
        raise HTTPException(status_code=400, detail="Registration failed. Email or username may already be in use.")

    user = create_user(db, data.email, data.username, data.password)
    log_audit(db, "register", user_id=user.id, resource_type="user", resource_id=user.id,
              ip_address=request.client.host if request.client else None)
    db.commit()
    token = create_access_token(user.id)
    _set_token_cookie(response, token)
    return user


@router.post("/login", response_model=UserResponse)
def login(data: UserLogin, response: Response, request: Request, db: Session = Depends(get_db)):
    _auth_limiter.check(request.client.host if request.client else "unknown")

    # Resolve to canonical user first so both email and username map to the same lockout counter.
    # Without this, an attacker gets _MAX_FAILED_ATTEMPTS guesses per login alias (email + username).
    user = get_user_by_email(db, data.login) or get_user_by_username(db, data.login)
    login_key = str(user.id) if user else f"unknown:{data.login.lower()}"
    _check_brute_force(login_key)

    if not user or not verify_password(data.password, user.hashed_password):
        _record_failed_login(login_key)
        raise HTTPException(status_code=401, detail="Invalid credentials")

    _clear_failed_logins(login_key)
    log_audit(db, "login", user_id=user.id, resource_type="user", resource_id=user.id,
              ip_address=request.client.host if request.client else None)
    db.commit()
    token = create_access_token(user.id)
    _set_token_cookie(response, token)
    return user


@router.post("/logout")
def logout(response: Response):
    settings = get_settings()
    response.delete_cookie(
        key=settings.cookie_name,
        path="/",
        httponly=True,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
    )
    return {"message": "Logged out"}


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.get("/csrf")
def get_csrf_token(response: Response):
    """Issue a CSRF token as a JS-readable cookie for the double-submit pattern."""
    settings = get_settings()
    token = secrets.token_hex(32)
    response.set_cookie(
        key="csrf_token",
        value=token,
        httponly=False,
        secure=settings.cookie_secure,
        samesite="strict",
        max_age=3600,
        path="/",
    )
    return {"csrf_token": token}


@router.post("/forgot-password")
def forgot_password(data: ForgotPasswordRequest, request: Request, db: Session = Depends(get_db)):
    _auth_limiter.check(request.client.host if request.client else "unknown")
    raw_token = create_reset_token(db, data.email)
    result: dict = {"message": "If the email exists, a reset link has been sent."}
    if raw_token and settings.debug:
        result["debug_token"] = raw_token
    if raw_token:
        user = get_user_by_email(db, data.email)
        if user:
            def _send():
                from app.services.email_service import send_password_reset_email
                send_password_reset_email(
                    to_email=user.email,
                    reset_token=raw_token,
                    username=user.username,
                    smtp_host=settings.smtp_host,
                    smtp_port=settings.smtp_port,
                    smtp_user=settings.smtp_user,
                    smtp_password=settings.smtp_password,
                    smtp_from=settings.smtp_from,
                    smtp_tls=settings.smtp_tls,
                    frontend_url=settings.frontend_url,
                )
            threading.Thread(target=_send, daemon=True).start()
    return result


@router.post("/reset-password")
def reset_password(data: ResetPasswordRequest, db: Session = Depends(get_db)):
    if not consume_reset_token(db, data.token, data.new_password):
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    return {"message": "Password updated successfully"}
