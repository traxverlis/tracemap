"""Data portability and erasure (GDPR articles 15, 17 and 20)."""

from __future__ import annotations

from datetime import UTC, date, datetime
from typing import Any

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.models import (
    Account,
    AISuggestion,
    Company,
    CompletenessTarget,
    DataBroker,
    DeletionRequest,
    Domain,
    Evidence,
    Finding,
    Identifier,
    Identity,
    Photo,
    Profile,
    Relationship,
    Scan,
    ScanResult,
)


def _serialise(instance: Any) -> dict[str, Any]:
    payload: dict[str, Any] = {}
    for column in instance.__table__.columns:
        value = getattr(instance, column.name)
        if isinstance(value, datetime | date):
            value = value.isoformat()
        payload[column.name] = value
    return payload


def export_identity(db: Session, identity: Identity) -> dict[str, Any]:
    """Return every row related to ``identity`` as plain JSON-ready data."""
    findings = list(db.scalars(select(Finding).where(Finding.identity_id == identity.id)))
    finding_ids = [finding.id for finding in findings]
    scans = list(db.scalars(select(Scan).where(Scan.identity_id == identity.id)))
    scan_ids = [scan.id for scan in scans]

    evidence = (
        list(db.scalars(select(Evidence).where(Evidence.finding_id.in_(finding_ids))))
        if finding_ids
        else []
    )
    scan_results = (
        list(db.scalars(select(ScanResult).where(ScanResult.scan_id.in_(scan_ids))))
        if scan_ids
        else []
    )

    return {
        "format": "digital-identity-manager/export/1",
        "exported_at": datetime.now(UTC).isoformat(),
        "identity": _serialise(identity),
        "identifiers": [
            _serialise(row)
            for row in db.scalars(select(Identifier).where(Identifier.identity_id == identity.id))
        ],
        "companies": [
            _serialise(row)
            for row in db.scalars(select(Company).where(Company.identity_id == identity.id))
        ],
        "domains": [
            _serialise(row)
            for row in db.scalars(select(Domain).where(Domain.identity_id == identity.id))
        ],
        "profiles": [
            _serialise(row)
            for row in db.scalars(select(Profile).where(Profile.identity_id == identity.id))
        ],
        "photos": [
            _serialise(row)
            for row in db.scalars(select(Photo).where(Photo.identity_id == identity.id))
        ],
        "accounts": [
            _serialise(row)
            for row in db.scalars(select(Account).where(Account.identity_id == identity.id))
        ],
        "findings": [_serialise(row) for row in findings],
        "evidence": [_serialise(row) for row in evidence],
        "scans": [_serialise(row) for row in scans],
        "scan_results": [_serialise(row) for row in scan_results],
        "relationships": [
            _serialise(row)
            for row in db.scalars(
                select(Relationship).where(Relationship.identity_id == identity.id)
            )
        ],
        "deletion_requests": [
            _serialise(row)
            for row in db.scalars(
                select(DeletionRequest).where(DeletionRequest.identity_id == identity.id)
            )
        ],
        "completeness_targets": [
            _serialise(row)
            for row in db.scalars(
                select(CompletenessTarget).where(CompletenessTarget.identity_id == identity.id)
            )
        ],
        "data_brokers": [_serialise(row) for row in db.scalars(select(DataBroker))],
        # ``AISuggestion`` links to its identity through the payload, so the
        # scoping is done with a JSON path: an export must never leak another
        # identity, and the filter stays in SQL to avoid a full-table scan.
        "ai_suggestions": [
            _serialise(row)
            for row in db.scalars(
                select(AISuggestion).where(
                    AISuggestion.payload_json["identity_id"].as_string() == identity.id
                )
            )
        ],
    }


def erase_identity(db: Session, identity: Identity) -> dict[str, int]:
    """Delete every row belonging to ``identity``.

    Files stored on the evidence volume are intentionally left untouched: they
    are removed by ``scripts/backup.sh``-style operations or manually, so an
    accidental API call can never destroy captured proof.
    """
    deleted: dict[str, int] = {}
    finding_ids = [
        row for row in db.scalars(select(Finding.id).where(Finding.identity_id == identity.id))
    ]
    scan_ids = [row for row in db.scalars(select(Scan.id).where(Scan.identity_id == identity.id))]

    if finding_ids:
        deleted["evidence"] = int(
            db.execute(delete(Evidence).where(Evidence.finding_id.in_(finding_ids))).rowcount or 0
        )
    if scan_ids:
        deleted["scan_results"] = int(
            db.execute(delete(ScanResult).where(ScanResult.scan_id.in_(scan_ids))).rowcount or 0
        )

    for model in (
        DeletionRequest,
        Finding,
        Scan,
        Relationship,
        Account,
        Photo,
        Profile,
        Domain,
        Company,
        CompletenessTarget,
        Identifier,
    ):
        deleted[model.__tablename__] = int(
            db.execute(delete(model).where(model.identity_id == identity.id)).rowcount or 0
        )

    deleted["identity"] = int(
        db.execute(delete(Identity).where(Identity.id == identity.id)).rowcount or 0
    )
    return deleted
