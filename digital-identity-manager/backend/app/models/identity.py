"""Core identity inventory models."""

from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from app.models.base import Base, TimestampMixin, UUIDMixin


class Identity(UUIDMixin, TimestampMixin, Base):
    """The subject of the audit - normally the operator themselves."""

    __tablename__ = "identity"

    label: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    first_name: Mapped[str | None] = mapped_column(String(120))
    last_name: Mapped[str | None] = mapped_column(String(120))
    birth_date: Mapped[date | None] = mapped_column(Date)
    country: Mapped[str | None] = mapped_column(String(2))
    # Free-form research hints: name variants, cities lived in, notes...
    attributes: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    # Explicit acknowledgement that the operator owns / is authorised for this
    # identity. Scans are refused until this is set.
    authorization_ack: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    authorization_ack_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    identifiers: Mapped[list[Identifier]] = relationship(
        back_populates="identity", cascade="all, delete-orphan"
    )


class Identifier(UUIDMixin, TimestampMixin, Base):
    """Emails, phones, usernames, names, addresses and domains."""

    __tablename__ = "identifiers"
    __table_args__ = (
        Index("ix_identifiers_identity_type", "identity_id", "type"),
        Index("ix_identifiers_normalized", "type", "normalized_value"),
    )

    identity_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("identity.id", ondelete="CASCADE"), nullable=False
    )
    type: Mapped[str] = mapped_column(String(32), nullable=False)
    value: Mapped[str] = mapped_column(String(512), nullable=False)
    normalized_value: Mapped[str] = mapped_column(String(512), nullable=False)
    subtype: Mapped[str | None] = mapped_column(String(64))
    label: Mapped[str | None] = mapped_column(String(120))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    confidence: Mapped[int] = mapped_column(Integer, default=100, nullable=False)
    valid_from: Mapped[date | None] = mapped_column(Date)
    valid_to: Mapped[date | None] = mapped_column(Date)
    first_seen: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_seen: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    source_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("sources.id", ondelete="SET NULL")
    )
    notes: Mapped[str | None] = mapped_column(Text)
    attributes: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)

    identity: Mapped[Identity] = relationship(back_populates="identifiers")


class Company(UUIDMixin, TimestampMixin, Base):
    """Public professional information."""

    __tablename__ = "companies"

    identity_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("identity.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    position: Mapped[str | None] = mapped_column(String(200))
    website: Mapped[str | None] = mapped_column(String(512))
    professional_profile_url: Mapped[str | None] = mapped_column(String(512))
    professional_domain: Mapped[str | None] = mapped_column(String(255))
    valid_from: Mapped[date | None] = mapped_column(Date)
    valid_to: Mapped[date | None] = mapped_column(Date)
    is_former: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text)


class Domain(UUIDMixin, TimestampMixin, Base):
    """Personal domains and websites."""

    __tablename__ = "domains"

    identity_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("identity.id", ondelete="CASCADE"), nullable=False
    )
    domain: Mapped[str] = mapped_column(String(255), nullable=False)
    known_owner: Mapped[str | None] = mapped_column(String(200))
    registrar: Mapped[str | None] = mapped_column(String(200))
    status: Mapped[str | None] = mapped_column(String(64))
    valid_from: Mapped[date | None] = mapped_column(Date)
    valid_to: Mapped[date | None] = mapped_column(Date)
    notes: Mapped[str | None] = mapped_column(Text)
    attributes: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)


class Profile(UUIDMixin, TimestampMixin, Base):
    """Profiles the operator declares as their own (manual inventory)."""

    __tablename__ = "profiles"

    identity_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("identity.id", ondelete="CASCADE"), nullable=False
    )
    platform: Mapped[str] = mapped_column(String(120), nullable=False)
    username: Mapped[str | None] = mapped_column(String(255))
    url: Mapped[str | None] = mapped_column(String(512))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_public: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text)
    source_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("sources.id", ondelete="SET NULL")
    )


class Photo(UUIDMixin, TimestampMixin, Base):
    """References to the operator's own photos / avatars.

    Only hashes and metadata are stored in PostgreSQL; the binary stays on the
    evidence volume. No facial recognition is performed by this project.
    """

    __tablename__ = "photos"

    identity_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("identity.id", ondelete="CASCADE"), nullable=False
    )
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    storage_path: Mapped[str] = mapped_column(String(512), nullable=False)
    sha256: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    perceptual_hash: Mapped[str | None] = mapped_column(String(64), index=True)
    content_type: Mapped[str | None] = mapped_column(String(100))
    size_bytes: Mapped[int | None] = mapped_column(Integer)
    platform: Mapped[str | None] = mapped_column(String(120))
    source: Mapped[str | None] = mapped_column(String(200))
    notes: Mapped[str | None] = mapped_column(Text)


class CompletenessTarget(UUIDMixin, TimestampMixin, Base):
    """How many items the operator expects to inventory per category.

    The completeness score measures *inventory coverage*, never the amount of
    personal data exposed.
    """

    __tablename__ = "completeness_targets"

    identity_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("identity.id", ondelete="CASCADE"), nullable=False
    )
    category: Mapped[str] = mapped_column(String(64), nullable=False)
    expected_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
