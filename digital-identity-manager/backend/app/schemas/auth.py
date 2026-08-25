"""Authentication schemas."""

from __future__ import annotations

from pydantic import BaseModel, EmailStr, Field

from app.schemas.common import ORMModel


class UserPublic(ORMModel):
    id: str
    email: EmailStr
    display_name: str | None = None
    is_admin: bool = False
    auth_provider: str = "local"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=256)


class BootstrapRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=12, max_length=256)
    display_name: str | None = Field(default=None, max_length=120)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"  # noqa: S105 - OAuth2 scheme name
    user: UserPublic


class BootstrapStatus(BaseModel):
    needs_bootstrap: bool


class PasswordChangeRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=256)
    new_password: str = Field(min_length=12, max_length=256)
