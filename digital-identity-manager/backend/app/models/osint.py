"""OSINT discovery models: sources, accounts, findings, evidence, scans."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from app.models.base import Base, TimestampMixin, UUIDMixin


class Source(UUIDMixin, TimestampMixin, Base):
    """Where a piece of information comes from (tool, site, manual entry)."""

    __tablename__ = "sources"

    name: Mapped[str] = mapped_column(String(200), nullable=False, unique=True)
    type: Mapped[str] = mapped_column(String(64), default="manual", nullable=False)
    url: Mapped[str | None] = mapped_column(String(512))
    reliability: Mapped[int] = mapped_column(Integer, default=50, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text)


class Account(UUIDMixin, TimestampMixin, Base):
    """An account discovered on a platform (candidate or confirmed)."""

    __tablename__ = "accounts"
    __table_args__ = (Index("ix_accounts_identity_platform", "identity_id", "platform"),)

    identity_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("identity.id", ondelete="CASCADE"), nullable=False
    )
    platform: Mapped[str] = mapped_column(String(120), nullable=False)
    username: Mapped[str | None] = mapped_column(String(255))
    email: Mapped[str | None] = mapped_column(String(320))
    url: Mapped[str | None] = mapped_column(String(512))
    status: Mapped[str] = mapped_column(String(32), default="NEW", nullable=False)
    confidence: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    source: Mapped[str | None] = mapped_column(String(120))
    first_seen: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_seen: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    attributes: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)


class Finding(UUIDMixin, TimestampMixin, Base):
    """Any piece of information discovered about the identity."""

    __tablename__ = "findings"
    __table_args__ = (Index("ix_findings_identity_category", "identity_id", "category"),)

    identity_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("identity.id", ondelete="CASCADE"), nullable=False
    )
    source: Mapped[str] = mapped_column(String(120), nullable=False)
    category: Mapped[str] = mapped_column(String(64), nullable=False)
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    value: Mapped[str | None] = mapped_column(Text)
    url: Mapped[str | None] = mapped_column(String(512))
    confidence: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="NEW", nullable=False)
    broker_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("data_brokers.id", ondelete="SET NULL")
    )
    account_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("accounts.id", ondelete="SET NULL")
    )
    scan_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("scans.id", ondelete="SET NULL")
    )
    discovered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    attributes: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)

    evidence: Mapped[list[Evidence]] = relationship(
        back_populates="finding", cascade="all, delete-orphan"
    )


class Evidence(UUIDMixin, TimestampMixin, Base):
    """Proof kept for a finding (hash, screenshot, saved HTML)."""

    __tablename__ = "evidence"

    finding_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("findings.id", ondelete="CASCADE"), nullable=False
    )
    source_url: Mapped[str | None] = mapped_column(String(512))
    captured_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    content_hash: Mapped[str | None] = mapped_column(String(64), index=True)
    screenshot_path: Mapped[str | None] = mapped_column(String(512))
    html_path: Mapped[str | None] = mapped_column(String(512))
    metadata_json: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)

    finding: Mapped[Finding] = relationship(back_populates="evidence")


class Scan(UUIDMixin, TimestampMixin, Base):
    """One execution of an OSINT tool against one target."""

    __tablename__ = "scans"

    identity_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("identity.id", ondelete="CASCADE")
    )
    scan_type: Mapped[str] = mapped_column(String(64), nullable=False)
    target: Mapped[str] = mapped_column(String(512), nullable=False)
    tool: Mapped[str] = mapped_column(String(64), nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="PENDING", nullable=False)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    scheduled_for: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    error: Mapped[str | None] = mapped_column(Text)
    parameters_json: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)

    results: Mapped[list[ScanResult]] = relationship(
        back_populates="scan", cascade="all, delete-orphan"
    )


class ScanResult(UUIDMixin, Base):
    """A single raw row produced by a scan, before human validation."""

    __tablename__ = "scan_results"

    scan_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("scans.id", ondelete="CASCADE"), nullable=False
    )
    result_type: Mapped[str] = mapped_column(String(64), nullable=False)
    value: Mapped[str | None] = mapped_column(Text)
    url: Mapped[str | None] = mapped_column(String(512))
    confidence: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    raw_result_json: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    created_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    scan: Mapped[Scan] = relationship(back_populates="results")


class Relationship(UUIDMixin, TimestampMixin, Base):
    """Typed, scored edge of the identity graph."""

    __tablename__ = "relationships"
    __table_args__ = (
        Index("ix_relationships_source", "source_entity_type", "source_entity_id"),
        Index("ix_relationships_target", "target_entity_type", "target_entity_id"),
    )

    identity_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("identity.id", ondelete="CASCADE")
    )
    source_entity_type: Mapped[str] = mapped_column(String(64), nullable=False)
    source_entity_id: Mapped[str] = mapped_column(String(36), nullable=False)
    target_entity_type: Mapped[str] = mapped_column(String(64), nullable=False)
    target_entity_id: Mapped[str] = mapped_column(String(36), nullable=False)
    relationship_type: Mapped[str] = mapped_column(String(64), nullable=False)
    confidence: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    source: Mapped[str | None] = mapped_column(String(120))
    status: Mapped[str] = mapped_column(String(32), default="UNKNOWN", nullable=False)
    reason: Mapped[str | None] = mapped_column(Text)
    # Explainable breakdown produced by the correlation engine.
    explanation_json: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    decided_by: Mapped[str | None] = mapped_column(String(36))
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
