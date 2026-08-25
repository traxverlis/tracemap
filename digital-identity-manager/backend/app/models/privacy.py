"""Privacy models: data brokers and deletion / opt-out requests."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin


class DataBroker(UUIDMixin, TimestampMixin, Base):
    """A people-search site / data broker.

    ``optout_url`` is never generated: it is either imported from the curated
    ``data/data_brokers.csv`` file or entered manually after verification.
    """

    __tablename__ = "data_brokers"

    name: Mapped[str] = mapped_column(String(200), nullable=False, unique=True)
    domain: Mapped[str | None] = mapped_column(String(255))
    country: Mapped[str | None] = mapped_column(String(64))
    category: Mapped[str | None] = mapped_column(String(64))
    search_url: Mapped[str | None] = mapped_column(String(512))
    optout_url: Mapped[str | None] = mapped_column(String(512))
    optout_method: Mapped[str | None] = mapped_column(String(64))
    requires_email: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    requires_phone: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    requires_identity_document: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    # Whether an *authorised, terms-compliant* automation exists. Nothing in
    # this project bypasses CAPTCHAs, anti-bot or access controls.
    automation_possible: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text)
    last_checked: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class DeletionRequest(UUIDMixin, TimestampMixin, Base):
    """Tracking of an opt-out / erasure request (GDPR art. 17)."""

    __tablename__ = "deletion_requests"

    identity_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("identity.id", ondelete="CASCADE")
    )
    finding_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("findings.id", ondelete="SET NULL")
    )
    broker_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("data_brokers.id", ondelete="SET NULL")
    )
    status: Mapped[str] = mapped_column(String(32), default="TODO", nullable=False)
    method: Mapped[str | None] = mapped_column(String(64))
    requested_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    confirmation: Mapped[str | None] = mapped_column(Text)
    confirmation_url: Mapped[str | None] = mapped_column(String(512))
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    next_check: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    notes: Mapped[str | None] = mapped_column(Text)
