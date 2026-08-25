"""Local authentication endpoints.

Only a local provider is implemented today; the ``auth_provider`` column and the
token issuing helper leave room for OIDC / OAuth2 without touching the routes.
"""

from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import func, select

from app.api.deps import CurrentUser, DbSession
from app.models import User
from app.schemas.auth import (
    BootstrapRequest,
    BootstrapStatus,
    LoginRequest,
    PasswordChangeRequest,
    TokenResponse,
    UserPublic,
)
from app.schemas.common import StatusResponse
from app.security import (
    PasswordPolicyError,
    create_access_token,
    hash_password,
    needs_rehash,
    verify_password,
)
from app.services import audit

router = APIRouter(prefix="/auth", tags=["auth"])


def _user_count(db) -> int:
    return int(db.scalar(select(func.count(User.id))) or 0)


@router.get("/bootstrap-status", response_model=BootstrapStatus)
def bootstrap_status(db: DbSession) -> BootstrapStatus:
    return BootstrapStatus(needs_bootstrap=_user_count(db) == 0)


@router.post("/bootstrap", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def bootstrap(payload: BootstrapRequest, db: DbSession) -> TokenResponse:
    """Create the very first (administrator) account."""
    if _user_count(db) > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account already exists; ask an administrator to create yours.",
        )
    try:
        password_hash = hash_password(payload.password)
    except PasswordPolicyError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)
        ) from exc

    user = User(
        email=payload.email.lower(),
        display_name=payload.display_name,
        password_hash=password_hash,
        is_admin=True,
    )
    db.add(user)
    db.flush()
    audit.record(db, action="user.created", entity_type="user", entity_id=user.id, user_id=user.id)
    return TokenResponse(
        access_token=create_access_token(user.id), user=UserPublic.model_validate(user)
    )


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: DbSession) -> TokenResponse:
    user = db.scalar(select(User).where(User.email == payload.email.lower()))
    # The same generic error is returned for unknown users and wrong passwords.
    if (
        user is None
        or not user.is_active
        or not verify_password(payload.password, user.password_hash)
    ):
        audit.record(
            db,
            action="user.login_failed",
            entity_type="user",
            entity_id=user.id if user else None,
        )
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    if needs_rehash(user.password_hash):
        user.password_hash = hash_password(payload.password)
    user.last_login_at = datetime.now(UTC)
    audit.record(db, action="user.login", entity_type="user", entity_id=user.id, user_id=user.id)
    return TokenResponse(
        access_token=create_access_token(user.id), user=UserPublic.model_validate(user)
    )


@router.get("/me", response_model=UserPublic)
def me(user: CurrentUser) -> UserPublic:
    return UserPublic.model_validate(user)


@router.post("/password", response_model=StatusResponse)
def change_password(
    payload: PasswordChangeRequest, user: CurrentUser, db: DbSession
) -> StatusResponse:
    if not verify_password(payload.current_password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Current password is incorrect"
        )
    try:
        user.password_hash = hash_password(payload.new_password)
    except PasswordPolicyError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)
        ) from exc
    audit.record(
        db, action="user.password_changed", entity_type="user", entity_id=user.id, user_id=user.id
    )
    return StatusResponse()
