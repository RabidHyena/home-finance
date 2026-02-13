import time

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.dependencies import get_current_user
from app.models import User
from app.schemas_auth import UserLogin, UserRegister, UserResponse
from app.services.auth_service import (
    authenticate_user,
    create_access_token,
    create_user,
    get_user_by_email,
    get_user_by_username,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])

# Simple in-memory rate limiter (per-process; sufficient for single-worker deployments)
_rate_limit_store: dict[str, list[float]] = {}
_RATE_LIMIT_MAX_KEYS = 10000  # max tracked IPs before forced cleanup
_last_cleanup = 0.0
_CLEANUP_INTERVAL = 300  # full cleanup every 5 minutes


def _cleanup_store(now: float, window: int) -> None:
    """Remove all expired entries from the store."""
    global _last_cleanup
    expired_keys = [ip for ip, times in _rate_limit_store.items()
                    if not any(now - t < window for t in times)]
    for key in expired_keys:
        del _rate_limit_store[key]
    _last_cleanup = now


def _check_rate_limit(client_ip: str) -> None:
    global _last_cleanup
    settings = get_settings()
    window = settings.rate_limit_window
    max_requests = settings.rate_limit_max_requests
    now = time.time()

    # Periodic full cleanup to prevent memory leak
    if now - _last_cleanup > _CLEANUP_INTERVAL or len(_rate_limit_store) > _RATE_LIMIT_MAX_KEYS:
        _cleanup_store(now, window)

    # Clean this IP's expired entries
    attempts = _rate_limit_store.get(client_ip, [])
    attempts = [t for t in attempts if now - t < window]

    if len(attempts) >= max_requests:
        _rate_limit_store[client_ip] = attempts
        raise HTTPException(
            status_code=429,
            detail="Too many requests. Please try again later.",
        )
    attempts.append(now)
    _rate_limit_store[client_ip] = attempts


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
    _check_rate_limit(request.client.host if request.client else "unknown")
    if get_user_by_email(db, data.email) or get_user_by_username(db, data.username):
        raise HTTPException(status_code=400, detail="Registration failed. Email or username may already be in use.")

    user = create_user(db, data.email, data.username, data.password)
    token = create_access_token(user.id)
    _set_token_cookie(response, token)
    return user


@router.post("/login", response_model=UserResponse)
def login(data: UserLogin, response: Response, request: Request, db: Session = Depends(get_db)):
    _check_rate_limit(request.client.host if request.client else "unknown")
    user = authenticate_user(db, data.login, data.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

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
