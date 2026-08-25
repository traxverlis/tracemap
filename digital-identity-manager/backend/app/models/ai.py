"""AI suggestions, local users and the audit log."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import JSON

from app.models.base import Base, TimestampMixin, UUIDMixin


class AISuggestion(UUIDMixin, Base):
    """Every LLM output is stored as a suggestion awaiting human validation."""

    __tablename__ = "ai_suggestions"

    type: Mapped[str] = mapped_column(String(64), nullable=False)
    source_entity: Mapped[str | None] = mapped_column(String(128))
    target_entity: Mapped[str | None] = mapped_column(String(128))
    # Only the hash of the (minimised) context is stored, never the raw prompt.
    prompt_context_hash: Mapped[str | None] = mapped_column(String(64))
    provider: Mapped[str | None] = mapped_column(String(32))
    model: Mapped[str | None] = mapped_column(String(120))
    suggestion: Mapped[str] = mapped_column(Text, nullable=False)
    rationale: Mapped[str | None] = mapped_column(Text)
    confidence: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="PENDING", nullable=False)
    created_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    validated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    validated_by: Mapped[str | None] = mapped_column(String(36))
    payload_json: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)


class User(UUIDMixin, TimestampMixin, Base):
    """Local application user (Argon2id password hash, never plaintext)."""

    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(320), nullable=False, unique=True)
    display_name: Mapped[str | None] = mapped_column(String(120))
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    # Reserved for a future OIDC / OAuth2 provider ("local" for now).
    auth_provider: Mapped[str] = mapped_column(String(32), default="local", nullable=False)
    external_subject: Mapped[str | None] = mapped_column(String(255))
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class AuditLog(UUIDMixin, Base):
    """Append-only trail of every human and automated decision."""

    __tablename__ = "audit_log"

    user_id: Mapped[str | None] = mapped_column(String(36))
    action: Mapped[str] = mapped_column(String(120), nullable=False)
    entity_type: Mapped[str | None] = mapped_column(String(64))
    entity_id: Mapped[str | None] = mapped_column(String(36))
    timestamp: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    metadata_json: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
