"""Timeline scoping and identity export isolation."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from app.models import AISuggestion, Identity
from app.services import audit
from app.services import privacy as privacy_service
from app.services import timeline as timeline_service


def _identity(db, label: str) -> Identity:
    identity = Identity(label=label)
    db.add(identity)
    db.flush()
    return identity


def test_timeline_limit_applies_after_the_identity_filter(session):
    mine = _identity(session, "Me")
    other = _identity(session, "Someone else")

    base = datetime.now(UTC)
    # The noise is more recent, so a limit applied before the filter would
    # return nothing at all for the scoped identity.
    for index in range(20):
        entry = audit.record(
            session,
            action="identifier.created",
            metadata={"identity_id": other.id},
        )
        entry.timestamp = base - timedelta(minutes=index)
    mine_entry = audit.record(
        session,
        action="identity.created",
        metadata={"identity_id": mine.id},
    )
    mine_entry.timestamp = base - timedelta(hours=1)
    global_entry = audit.record(session, action="correlation.run", metadata={})
    global_entry.timestamp = base - timedelta(hours=2)
    session.flush()

    events = timeline_service.build_timeline(session, mine.id, limit=5)

    actions = [event["action"] for event in events]
    assert actions == ["identity.created", "correlation.run"]
    assert all(event["metadata"].get("identity_id") in (None, mine.id) for event in events)


def test_timeline_without_identity_returns_every_event(session):
    identity = _identity(session, "Me")
    audit.record(session, action="identity.created", metadata={"identity_id": identity.id})
    audit.record(session, action="correlation.run", metadata={})
    session.flush()

    events = timeline_service.build_timeline(session, None, limit=10)
    assert {event["action"] for event in events} == {"identity.created", "correlation.run"}


def test_export_never_leaks_another_identity_ai_suggestions(session):
    mine = _identity(session, "Me")
    other = _identity(session, "Someone else")

    session.add_all(
        [
            AISuggestion(
                type="correlation",
                suggestion="Looks like the same person",
                payload_json={"identity_id": mine.id},
            ),
            AISuggestion(
                type="correlation",
                suggestion="Unrelated identity",
                payload_json={"identity_id": other.id},
            ),
            AISuggestion(type="summary", suggestion="No identity at all", payload_json={}),
        ]
    )
    session.flush()

    export = privacy_service.export_identity(session, mine)

    assert [row["suggestion"] for row in export["ai_suggestions"]] == ["Looks like the same person"]
