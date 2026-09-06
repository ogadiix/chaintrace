"""
Authentication Request & Response Schemas
"""

from pydantic import BaseModel, ConfigDict, EmailStr


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    fullName: str
    role: str
    isActive: bool
    createdAt: str


class TokenResponse(BaseModel):
    accessToken: str
    tokenType: str = "bearer"
    user: UserResponse
