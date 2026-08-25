"""Local authentication primitives: Argon2id hashing and JWT access tokens.

The design keeps room for external identity providers (OIDC / OAuth2): users
carry an ``auth_provider`` and ``external_subject`` column, and token issuing is
isolated behind :func:`create_access_token`.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError

from app.config import get_settings

_hasher = PasswordHasher()
ALGORITHM = "HS256"
MIN_PASSWORD_LENGTH = 12


class PasswordPolicyError(ValueError):
    """Raised when a password does not satisfy the local policy."""


def validate_password(password: str) -> None:
    if len(password) < MIN_PASSWORD_LENGTH:
        raise PasswordPolicyError(
            f"password must be at least {MIN_PASSWORD_LENGTH} characters long"
        )
    if password.strip() != password:
        raise PasswordPolicyError("password must not start or end with whitespace")


def hash_password(password: str) -> str:
    """Hash a password with Argon2id. Plaintext is never stored or logged."""
    validate_password(password)
    return _hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return _hasher.verify(password_hash, password)
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return False


def needs_rehash(password_hash: str) -> bool:
    try:
        return _hasher.check_needs_rehash(password_hash)
    except InvalidHashError:
        return True


def create_access_token(subject: str, extra_claims: dict[str, Any] | None = None) -> str:
    settings = get_settings()
    now = datetime.now(UTC)
    payload: dict[str, Any] = {
        "sub": subject,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=settings.access_token_ttl_minutes)).timestamp()),
        "iss": "digital-identity-manager",
    }
    if extra_claims:
        payload.update(extra_claims)
    return jwt.encode(payload, settings.secret_key, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict[str, Any]:
    settings = get_settings()
    return jwt.decode(
        token,
        settings.secret_key,
        algorithms=[ALGORITHM],
        issuer="digital-identity-manager",
    )
