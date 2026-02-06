from fastapi import APIRouter, Depends, HTTPException, Response, status
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
def register(data: UserRegister, response: Response, db: Session = Depends(get_db)):
    if get_user_by_email(db, data.email):
        raise HTTPException(status_code=400, detail="Email already registered")
    if get_user_by_username(db, data.username):
        raise HTTPException(status_code=400, detail="Username already taken")

    user = create_user(db, data.email, data.username, data.password)
    token = create_access_token(user.id)
    _set_token_cookie(response, token)
    return user


@router.post("/login", response_model=UserResponse)
def login(data: UserLogin, response: Response, db: Session = Depends(get_db)):
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
