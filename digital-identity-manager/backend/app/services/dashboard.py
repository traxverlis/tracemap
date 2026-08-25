"""Dashboard aggregation."""

from __future__ import annotations

from typing import Any

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.models import (
    Account,
    DataBroker,
    DeletionRequest,
    Finding,
    Identifier,
    Identity,
    Profile,
    Relationship,
    Scan,
    ScanResult,
)
from app.services import completeness


def _count(db: Session, column, *conditions) -> int:
    query = select(func.count(column))
    for condition in conditions:
        query = query.where(condition)
    return int(db.scalar(query) or 0)


def _identifier_count(db: Session, identity_id: str, identifier_type: str | None = None) -> int:
    conditions = [Identifier.identity_id == identity_id]
    if identifier_type:
        conditions.append(Identifier.type == identifier_type)
    return _count(db, Identifier.id, *conditions)


def _scan_payload(db: Session, scan: Scan | None) -> dict[str, Any] | None:
    if scan is None:
        return None
    payload = {column.name: getattr(scan, column.name) for column in scan.__table__.columns}
    payload["result_count"] = int(
        db.scalar(select(func.count(ScanResult.id)).where(ScanResult.scan_id == scan.id)) or 0
    )
    return payload


def build_summary(db: Session, identity: Identity) -> dict[str, Any]:
    identity_id = identity.id
    last_scan = db.scalar(
        select(Scan)
        .where(Scan.identity_id == identity_id, Scan.finished_at.is_not(None))
        .order_by(Scan.finished_at.desc())
        .limit(1)
    )
    next_scans = list(
        db.scalars(
            select(Scan)
            .where(
                Scan.identity_id == identity_id,
                or_(Scan.status == "PENDING", Scan.status == "RUNNING"),
            )
            .order_by(Scan.created_at.asc())
            .limit(10)
        )
    )
    return {
        "identifiers": _identifier_count(db, identity_id),
        "emails": _identifier_count(db, identity_id, "email"),
        "phones": _identifier_count(db, identity_id, "phone"),
        "usernames": _identifier_count(db, identity_id, "username"),
        "addresses": _identifier_count(db, identity_id, "address"),
        "profiles": _count(db, Profile.id, Profile.identity_id == identity_id),
        "accounts_found": _count(db, Account.id, Account.identity_id == identity_id),
        "relationships_confirmed": _count(
            db,
            Relationship.id,
            Relationship.identity_id == identity_id,
            Relationship.status == "CONFIRMED",
        ),
        "relationships_to_review": _count(
            db,
            Relationship.id,
            Relationship.identity_id == identity_id,
            Relationship.status == "SUGGESTED",
        ),
        "data_brokers": _count(db, DataBroker.id),
        "deletions_todo": _count(
            db,
            DeletionRequest.id,
            DeletionRequest.identity_id == identity_id,
            DeletionRequest.status == "TODO",
        ),
        "deletions_requested": _count(
            db,
            DeletionRequest.id,
            DeletionRequest.identity_id == identity_id,
            DeletionRequest.status.in_(["REQUESTED", "IN_PROGRESS"]),
        ),
        "deletions_confirmed": _count(
            db,
            DeletionRequest.id,
            DeletionRequest.identity_id == identity_id,
            DeletionRequest.status == "CONFIRMED",
        ),
        "data_reappeared": _count(
            db,
            DeletionRequest.id,
            DeletionRequest.identity_id == identity_id,
            DeletionRequest.status == "REAPPEARED",
        )
        + _count(
            db,
            Finding.id,
            Finding.identity_id == identity_id,
            Finding.status == "REAPPEARED",
        ),
        "breaches": _count(
            db,
            Finding.id,
            Finding.identity_id == identity_id,
            Finding.category == "breach",
        ),
        "last_scan": _scan_payload(db, last_scan),
        "next_scans": [_scan_payload(db, scan) for scan in next_scans],
        "completeness": completeness.compute(db, identity),
    }
