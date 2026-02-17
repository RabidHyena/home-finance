from pydantic import BaseModel, ConfigDict, EmailStr, Field
from datetime import datetime


class UserRegister(BaseModel):
    email: EmailStr = Field(..., max_length=255)
    username: str = Field(..., min_length=3, max_length=100)
    password: str = Field(..., min_length=8)


class UserLogin(BaseModel):
    login: str = Field(..., description="Email or username")
    password: str


class UserResponse(BaseModel):
    id: int
    email: str
    username: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
