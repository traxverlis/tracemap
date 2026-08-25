"""Identity timeline, derived from the append-only audit log."""

from __future__ import annotations

from typing import Any

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.models import AuditLog

TITLES: dict[str, str] = {
    "identity.created": "Identity created",
    "identity.updated": "Identity updated",
    "identity.authorization": "Authorisation acknowledged",
    "identifier.created": "Identifier added",
    "identifier.updated": "Identifier updated",
    "identifier.deleted": "Identifier removed",
    "profile.created": "Profile added",
    "photo.created": "Photo / avatar added",
    "company.created": "Professional entry added",
    "domain.created": "Domain added",
    "scan.created": "Scan queued",
    "scan.completed": "Scan completed",
    "scan.failed": "Scan failed",
    "scan.promoted": "Scan results promoted",
    "account.discovered": "Account discovered",
    "finding.created": "Finding recorded",
    "data_broker.discovered": "Data broker record found",
    "relationship.confirmed": "Correlation confirmed",
    "relationship.rejected": "Correlation rejected",
    "relationship.postponed": "Correlation postponed",
    "correlation.run": "Correlation engine executed",
    "deletion.created": "Deletion request created",
    "deletion.requested": "Deletion requested",
    "deletion.confirmed": "Deletion confirmed",
    "deletion.reappeared": "Data reappeared",
    "ai.suggested": "AI suggestions generated",
    "ai.decision": "AI suggestion reviewed",
    "privacy.erased": "Data erased",
}


def build_timeline(
    db: Session, identity_id: str | None = None, limit: int = 100
) -> list[dict[str, Any]]:
    query = select(AuditLog)
    if identity_id:
        # Filter in SQL, before the limit, so scoping to an identity cannot
        # starve the page with events belonging to other identities. Entries
        # without an ``identity_id`` are global and stay visible.
        scoped_to = AuditLog.metadata_json["identity_id"].as_string()
        query = query.where(or_(scoped_to.is_(None), scoped_to == identity_id))

    query = query.order_by(AuditLog.timestamp.desc()).limit(max(1, min(limit, 500)))
    events: list[dict[str, Any]] = []
    for entry in db.scalars(query):
        metadata = entry.metadata_json or {}
        events.append(
            {
                "id": entry.id,
                "timestamp": entry.timestamp,
                "action": entry.action,
                "entity_type": entry.entity_type,
                "entity_id": entry.entity_id,
                "title": TITLES.get(entry.action, entry.action.replace(".", " ").capitalize()),
                "metadata": metadata,
            }
        )
    return events
