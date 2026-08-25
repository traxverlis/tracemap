"""Human validation workflow for correlations."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Account, Identifier, Identity, Profile, Relationship
from app.services import audit
from app.services.normalization import mask_phone

DECISION_STATUS = {"CONFIRM": "CONFIRMED", "REJECT": "REJECTED", "LATER": "SUGGESTED"}
DECISION_ACTION = {
    "CONFIRM": "relationship.confirmed",
    "REJECT": "relationship.rejected",
    "LATER": "relationship.postponed",
}


def _entity_label(db: Session, entity_type: str, entity_id: str) -> tuple[str, dict[str, Any]]:
    if entity_type == "identity":
        identity = db.get(Identity, entity_id)
        return (identity.label if identity else "unknown identity"), {}
    if entity_type == "account":
        account = db.get(Account, entity_id)
        if not account:
            return "unknown account", {}
        label = (
            f"{account.platform}: {account.username or account.email or account.url or ''}".strip(
                ": "
            )
        )
        return label, {
            "platform": account.platform,
            "username": account.username,
            "url": account.url,
            "source": account.source,
            "status": account.status,
            "attributes": account.attributes or {},
        }
    if entity_type == "profile":
        profile = db.get(Profile, entity_id)
        if not profile:
            return "unknown profile", {}
        return f"{profile.platform}: {profile.username or ''}".strip(": "), {
            "platform": profile.platform,
            "username": profile.username,
            "url": profile.url,
        }
    identifier = db.get(Identifier, entity_id)
    if identifier:
        value = mask_phone(identifier.value) if identifier.type == "phone" else identifier.value
        return f"{identifier.type}: {value}", {"type": identifier.type}
    return f"{entity_type}:{entity_id}", {}


def build_review_queue(db: Session, identity_id: str | None = None) -> list[dict[str, Any]]:
    """Return every correlation awaiting a human decision."""
    query = select(Relationship).where(Relationship.status == "SUGGESTED")
    if identity_id:
        query = query.where(Relationship.identity_id == identity_id)
    query = query.order_by(Relationship.confidence.desc())

    items: list[dict[str, Any]] = []
    for relationship in db.scalars(query):
        source_label, source_context = _entity_label(
            db, relationship.source_entity_type, relationship.source_entity_id
        )
        target_label, target_context = _entity_label(
            db, relationship.target_entity_type, relationship.target_entity_id
        )
        platform = target_context.get("platform") or source_context.get("platform")
        username = target_context.get("username") or source_context.get("username")
        url = target_context.get("url") or source_context.get("url")
        question = (
            f"Is this {platform} account yours?"
            if platform
            else f"Do '{source_label}' and '{target_label}' belong to you?"
        )
        items.append(
            {
                "relationship": relationship,
                "question": question,
                "source_label": source_label,
                "target_label": target_label,
                "platform": platform,
                "username": username,
                "url": url,
                "context": {
                    "source": source_context,
                    "target": target_context,
                    "explanation": relationship.explanation_json or {},
                },
            }
        )
    return items


def apply_decision(
    db: Session,
    relationship: Relationship,
    decision: str,
    user_id: str | None,
    reason: str | None = None,
) -> Relationship:
    """Apply a human decision; the engine never overrides it afterwards."""
    if decision not in DECISION_STATUS:
        raise ValueError(f"unsupported decision: {decision!r}")

    old_status = relationship.status
    old_type = relationship.relationship_type
    relationship.status = DECISION_STATUS[decision]
    if decision == "CONFIRM" and relationship.relationship_type == "POSSIBLY_SAME_PERSON":
        relationship.relationship_type = "CONFIRMED_SAME_PERSON"
        relationship.confidence = 100
    elif decision == "REJECT" and relationship.relationship_type in {
        "POSSIBLY_SAME_PERSON",
        "CONFIRMED_SAME_PERSON",
    }:
        relationship.relationship_type = "NOT_SAME_PERSON"
        relationship.confidence = 0

    relationship.decided_by = user_id
    relationship.decided_at = datetime.now(UTC)
    if reason:
        relationship.reason = reason

    for entity_type, entity_id in (
        (relationship.source_entity_type, relationship.source_entity_id),
        (relationship.target_entity_type, relationship.target_entity_id),
    ):
        if entity_type != "account":
            continue
        account = db.get(Account, entity_id)
        if account is None:
            continue
        if decision == "CONFIRM":
            account.status = "CONFIRMED"
            account.confidence = 100
        elif decision == "REJECT":
            account.status = "REJECTED"
        else:
            account.status = "LATER"

    audit.record_change(
        db,
        action=DECISION_ACTION[decision],
        entity_type="relationship",
        entity_id=relationship.id,
        user_id=user_id,
        old_value={"status": old_status, "relationship_type": old_type},
        new_value={
            "status": relationship.status,
            "relationship_type": relationship.relationship_type,
        },
        reason=reason,
        extra={"identity_id": relationship.identity_id, "decision": decision},
    )
    db.flush()
    return relationship
