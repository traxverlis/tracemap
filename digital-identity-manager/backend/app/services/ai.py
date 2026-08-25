"""AI assistant service: builds a *minimal* context, stores suggestions.

Only the strict minimum required by the task leaves the database, and every
answer is persisted as an ``ai_suggestions`` row with status ``PENDING`` until a
human accepts or rejects it. The assistant never mutates the inventory.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.llm import IdentityAssistant, LLMResult
from app.models import Account, AISuggestion, Finding, Identifier, Identity, Relationship
from app.services import audit, completeness

MAX_ITEMS = 25


def build_context(db: Session, identity: Identity, task: str) -> dict[str, Any]:
    """Select only the fields the task actually needs (data minimisation)."""
    context: dict[str, Any] = {
        "task": task,
        "identity": {"label": identity.label, "country": identity.country},
    }

    if task in {"correlations", "summary"}:
        context["accounts"] = [
            {
                "id": account.id,
                "platform": account.platform,
                "username": account.username,
                "status": account.status,
                "confidence": account.confidence,
                "source": account.source,
            }
            for account in db.scalars(
                select(Account).where(Account.identity_id == identity.id).limit(MAX_ITEMS)
            )
        ]
        context["suggested_relationships"] = [
            {
                "id": relationship.id,
                "confidence": relationship.confidence,
                "reason": relationship.reason,
            }
            for relationship in db.scalars(
                select(Relationship)
                .where(
                    Relationship.identity_id == identity.id,
                    Relationship.status == "SUGGESTED",
                )
                .limit(MAX_ITEMS)
            )
        ]

    if task in {"summary", "search_ideas"}:
        context["findings"] = [
            {
                "category": finding.category,
                "title": finding.title,
                "source": finding.source,
                "status": finding.status,
                "confidence": finding.confidence,
            }
            for finding in db.scalars(
                select(Finding).where(Finding.identity_id == identity.id).limit(MAX_ITEMS)
            )
        ]

    if task in {"missing_information", "search_ideas"}:
        context["completeness"] = completeness.compute(db, identity)
        # Only the *types* and counts of identifiers are shared, never values.
        counts: dict[str, int] = {}
        for identifier in db.scalars(
            select(Identifier).where(Identifier.identity_id == identity.id)
        ):
            counts[identifier.type] = counts.get(identifier.type, 0) + 1
        context["identifier_counts"] = counts

    return context


def persist_suggestions(
    db: Session,
    result: LLMResult,
    identity: Identity,
    user_id: str | None = None,
) -> list[AISuggestion]:
    now = datetime.now(UTC)
    stored: list[AISuggestion] = []
    for suggestion in result.suggestions:
        row = AISuggestion(
            type=suggestion.type,
            source_entity=suggestion.source_entity,
            target_entity=suggestion.target_entity,
            prompt_context_hash=result.context_hash,
            provider=result.provider,
            model=result.model,
            suggestion=suggestion.suggestion,
            rationale=suggestion.rationale,
            confidence=suggestion.confidence,
            status="PENDING",
            created_at=now,
            payload_json={**suggestion.payload, "identity_id": identity.id},
        )
        db.add(row)
        stored.append(row)
    db.flush()
    audit.record(
        db,
        action="ai.suggested",
        entity_type="identity",
        entity_id=identity.id,
        user_id=user_id,
        metadata={
            "identity_id": identity.id,
            "provider": result.provider,
            "model": result.model,
            "context_hash": result.context_hash,
            "suggestions": len(stored),
        },
    )
    return stored


def run_task(
    db: Session,
    identity: Identity,
    task: str,
    user_id: str | None = None,
    assistant: IdentityAssistant | None = None,
) -> list[AISuggestion]:
    assistant = assistant or IdentityAssistant()
    context = build_context(db, identity, task)
    result = assistant.run(task, context)
    return persist_suggestions(db, result, identity, user_id)


def apply_decision(
    db: Session,
    suggestion: AISuggestion,
    decision: str,
    user_id: str | None,
    reason: str | None = None,
) -> AISuggestion:
    mapping = {"ACCEPT": "ACCEPTED", "REJECT": "REJECTED", "LATER": "LATER"}
    if decision not in mapping:
        raise ValueError(f"unsupported decision: {decision!r}")
    old_status = suggestion.status
    suggestion.status = mapping[decision]
    suggestion.validated_at = datetime.now(UTC)
    suggestion.validated_by = user_id
    audit.record_change(
        db,
        action="ai.decision",
        entity_type="ai_suggestion",
        entity_id=suggestion.id,
        user_id=user_id,
        old_value={"status": old_status},
        new_value={"status": suggestion.status},
        reason=reason,
        extra={"identity_id": (suggestion.payload_json or {}).get("identity_id")},
    )
    db.flush()
    return suggestion
