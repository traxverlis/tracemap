"""Scan orchestration: creation, execution and promotion of raw results."""

from __future__ import annotations

import logging
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.connectors import ConnectorDisabled, ConnectorError, get_connector
from app.models import Account, Finding, Identity, Scan, ScanResult
from app.services import audit
from app.services.normalization import mask_email, mask_phone

logger = logging.getLogger(__name__)


class ScanError(RuntimeError):
    """Raised when a scan cannot be created."""


class AuthorizationRequired(ScanError):
    """Raised when the identity has not been acknowledged as owned/authorised."""


def _now() -> datetime:
    return datetime.now(UTC)


def safe_target(scan_type: str, target: str) -> str:
    """Return a log-safe representation of a scan target."""
    if scan_type == "phone":
        return mask_phone(target)
    if scan_type in {"email", "breach"}:
        return mask_email(target)
    return target


def create_scan(
    db: Session,
    *,
    identity: Identity,
    tool: str,
    scan_type: str,
    target: str,
    parameters: dict[str, Any] | None = None,
    user_id: str | None = None,
    require_ack: bool = True,
) -> Scan:
    """Register a PENDING scan after validating tool availability and consent."""
    if require_ack and not identity.authorization_ack:
        raise AuthorizationRequired(
            "This identity has not been acknowledged as yours (or explicitly "
            "authorised). Confirm ownership on the Identity page before scanning."
        )

    connector = get_connector(tool)
    if not connector.enabled:
        raise ScanError(
            f"The '{tool}' connector is not available in this deployment "
            f"(requires: {', '.join(connector.requires) or 'n/a'})."
        )
    if connector.scan_types and scan_type not in connector.scan_types:
        raise ScanError(
            f"The '{tool}' connector does not support the '{scan_type}' scan type "
            f"(supported: {', '.join(connector.scan_types)})."
        )
    if not target.strip():
        raise ScanError("A scan target is required.")

    scan = Scan(
        identity_id=identity.id,
        scan_type=scan_type,
        target=target.strip(),
        tool=tool,
        status="PENDING",
        parameters_json=parameters or {},
    )
    db.add(scan)
    db.flush()
    audit.record(
        db,
        action="scan.created",
        entity_type="scan",
        entity_id=scan.id,
        user_id=user_id,
        metadata={"tool": tool, "scan_type": scan_type, "target": safe_target(scan_type, target)},
    )
    return scan


def execute_scan(db: Session, scan: Scan) -> Scan:
    """Run the connector for ``scan`` and persist its raw results."""
    if scan.status in {"COMPLETED", "CANCELLED"}:
        return scan

    scan.status = "RUNNING"
    scan.started_at = _now()
    db.flush()

    try:
        connector = get_connector(scan.tool)
        records = connector.run(scan.target, scan.parameters_json or {})
    except (ConnectorDisabled, ConnectorError) as exc:
        scan.status = "FAILED"
        scan.error = str(exc)[:2000]
        scan.finished_at = _now()
        db.flush()
        audit.record(
            db,
            action="scan.failed",
            entity_type="scan",
            entity_id=scan.id,
            metadata={"tool": scan.tool, "error": scan.error},
        )
        return scan
    except Exception as exc:  # pragma: no cover - defensive
        logger.exception("scan.unexpected_failure", extra={"scan_id": scan.id})
        scan.status = "FAILED"
        scan.error = f"unexpected error: {exc.__class__.__name__}"
        scan.finished_at = _now()
        db.flush()
        return scan

    for record in records:
        db.add(
            ScanResult(
                scan_id=scan.id,
                result_type=record.result_type,
                value=record.value,
                url=record.url,
                confidence=record.confidence,
                raw_result_json=record.raw,
                created_at=_now(),
            )
        )

    scan.status = "COMPLETED"
    scan.finished_at = _now()
    scan.error = None
    db.flush()
    audit.record(
        db,
        action="scan.completed",
        entity_type="scan",
        entity_id=scan.id,
        metadata={"tool": scan.tool, "results": len(records)},
    )
    return scan


def result_count(db: Session, scan_id: str) -> int:
    return int(
        db.scalar(select(func.count(ScanResult.id)).where(ScanResult.scan_id == scan_id)) or 0
    )


def _existing_account(
    db: Session, identity_id: str, platform: str, url: str | None
) -> Account | None:
    query = select(Account).where(Account.identity_id == identity_id, Account.platform == platform)
    if url:
        query = query.where(Account.url == url)
    return db.scalar(query)


def promote_results(
    db: Session,
    scan: Scan,
    result_ids: list[str],
    user_id: str | None = None,
) -> tuple[int, int]:
    """Turn selected raw results into accounts / findings awaiting validation."""
    query = select(ScanResult).where(ScanResult.scan_id == scan.id)
    if result_ids:
        query = query.where(ScanResult.id.in_(result_ids))
    results = list(db.scalars(query))

    accounts_created = 0
    findings_created = 0
    now = _now()

    for result in results:
        raw = result.raw_result_json or {}
        if result.result_type in {"account", "candidate"}:
            platform = str(raw.get("platform") or result.value or scan.tool)
            account = _existing_account(db, scan.identity_id or "", platform, result.url)
            if account is None:
                account = Account(
                    identity_id=scan.identity_id,
                    platform=platform,
                    username=scan.target if scan.scan_type == "username" else raw.get("username"),
                    email=scan.target if scan.scan_type == "email" else raw.get("email"),
                    url=result.url,
                    status="NEW",
                    confidence=result.confidence,
                    source=scan.tool,
                    first_seen=now,
                    last_seen=now,
                    attributes=raw,
                )
                db.add(account)
                db.flush()
                accounts_created += 1
            else:
                account.last_seen = now
                account.confidence = max(account.confidence, result.confidence)
            db.add(
                Finding(
                    identity_id=scan.identity_id,
                    source=scan.tool,
                    category="account",
                    title=f"{platform} account candidate",
                    value=result.value,
                    url=result.url,
                    confidence=result.confidence,
                    status="NEW",
                    account_id=account.id,
                    scan_id=scan.id,
                    discovered_at=now,
                    attributes=raw,
                )
            )
            findings_created += 1
            continue

        category = {
            "breach": "breach",
            "whois": "domain",
            "dns": "domain",
            "certificate": "domain",
            "subdomain": "domain",
            "data_broker": "data_broker",
        }.get(result.result_type, "other")
        db.add(
            Finding(
                identity_id=scan.identity_id,
                source=scan.tool,
                category=category,
                title=f"{result.result_type}: {result.value or scan.target}"[:300],
                value=result.value,
                url=result.url,
                confidence=result.confidence,
                status="NEW",
                scan_id=scan.id,
                discovered_at=now,
                attributes=raw,
            )
        )
        findings_created += 1

    db.flush()
    audit.record(
        db,
        action="scan.promoted",
        entity_type="scan",
        entity_id=scan.id,
        user_id=user_id,
        metadata={
            "accounts_created": accounts_created,
            "findings_created": findings_created,
            "results": len(results),
        },
    )
    return accounts_created, findings_created
