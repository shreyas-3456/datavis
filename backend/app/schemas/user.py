from pydantic import BaseModel, EmailStr
from uuid import UUID
from typing import Optional
from app.models.user import UserRole, AuthProvider

class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserOut(UserBase):
    id: UUID
    role: UserRole
    provider: AuthProvider
    is_active: bool
    is_verified: bool

    class Config:
        from_attributes = True