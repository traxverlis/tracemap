"""Append-only audit trail.

Every human decision (confirmation, rejection, deletion request, erasure) and
every automated action is recorded with who, what, when, and the before/after
values when relevant.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from sqlalchemy.orm import Session

from app.models import AuditLog


def record(
    db: Session,
    *,
    action: str,
    entity_type: str | None = None,
    entity_id: str | None = None,
    user_id: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> AuditLog:
    entry = AuditLog(
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        timestamp=datetime.now(UTC),
        metadata_json=metadata or {},
    )
    db.add(entry)
    return entry


def record_change(
    db: Session,
    *,
    action: str,
    entity_type: str,
    entity_id: str,
    user_id: str | None,
    old_value: Any = None,
    new_value: Any = None,
    reason: str | None = None,
    extra: dict[str, Any] | None = None,
) -> AuditLog:
    metadata: dict[str, Any] = {"old_value": old_value, "new_value": new_value}
    if reason:
        metadata["reason"] = reason
    if extra:
        metadata.update(extra)
    return record(
        db,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        user_id=user_id,
        metadata=metadata,
    )
