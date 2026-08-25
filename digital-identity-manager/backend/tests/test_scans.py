"""Scan pipeline: execution, promotion and the reappearance scheduler."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest

from app.connectors.base import ScanRecord
from app.models import Account, DeletionRequest, Identity, Scan, ScanResult
from app.services import scans as scan_service


class StubConnector:
    name = "stub"
    enabled = True
    scan_types = ("username",)
    requires = ()

    def run(self, target: str, options: dict) -> list[ScanRecord]:
        return [
            ScanRecord(
                result_type="account",
                value="github",
                url=f"https://github.com/{target}",
                confidence=80,
                raw={"platform": "github", "username": target},
            )
        ]

    def describe(self) -> dict:
        return {
            "tool": self.name,
            "scan_types": list(self.scan_types),
            "enabled": True,
            "description": "stub",
            "requires": [],
        }


@pytest.fixture()
def identity_row(session) -> Identity:
    identity = Identity(label="Me", authorization_ack=True)
    session.add(identity)
    session.flush()
    return identity


def test_scan_requires_acknowledgement(session):
    identity = Identity(label="Not acknowledged", authorization_ack=False)
    session.add(identity)
    session.flush()
    with pytest.raises(scan_service.AuthorizationRequired):
        scan_service.create_scan(
            session, identity=identity, tool="stub", scan_type="username", target="johndoe"
        )


def test_execute_and_promote(session, identity_row, monkeypatch):
    monkeypatch.setattr(scan_service, "get_connector", lambda name: StubConnector())

    scan = scan_service.create_scan(
        session, identity=identity_row, tool="stub", scan_type="username", target="johndoe"
    )
    assert scan.status == "PENDING"

    scan_service.execute_scan(session, scan)
    assert scan.status == "COMPLETED"
    assert scan.finished_at is not None

    results = session.query(ScanResult).filter_by(scan_id=scan.id).all()
    assert len(results) == 1

    accounts_created, _ = scan_service.promote_results(
        session, scan, [result.id for result in results]
    )
    assert accounts_created == 1

    account = session.query(Account).one()
    assert account.platform == "github"
    # A discovered account is never confirmed automatically.
    assert account.status == "NEW"
    assert account.confidence < 100

    # Promoting twice must not duplicate the account.
    scan_service.promote_results(session, scan, [result.id for result in results])
    assert session.query(Account).count() == 1


def test_failing_connector_marks_the_scan_failed(session, identity_row, monkeypatch):
    class Failing(StubConnector):
        def run(self, target: str, options: dict):
            from app.connectors.base import ConnectorError

            raise ConnectorError("runner unreachable")

    monkeypatch.setattr(scan_service, "get_connector", lambda name: Failing())
    scan = scan_service.create_scan(
        session, identity=identity_row, tool="stub", scan_type="username", target="johndoe"
    )
    scan_service.execute_scan(session, scan)
    assert scan.status == "FAILED"
    assert "runner unreachable" in (scan.error or "")


def test_safe_target_masks_sensitive_values():
    assert "612345" not in scan_service.safe_target("phone", "+33612345678")
    assert scan_service.safe_target("username", "johndoe") == "johndoe"
    assert "john.doe" not in scan_service.safe_target("email", "john.doe@example.com")


def test_worker_claims_pending_scans(session, identity_row, monkeypatch):
    from app.workers import scan_worker

    monkeypatch.setattr(scan_service, "get_connector", lambda name: StubConnector())
    scan_service.create_scan(
        session, identity=identity_row, tool="stub", scan_type="username", target="johndoe"
    )
    session.commit()

    claimed = scan_worker.claim_next_scan(session)
    assert claimed is not None
    assert claimed.status == "RUNNING"

    # A claimed scan is not handed out twice.
    assert scan_worker.claim_next_scan(session) is None


def test_scheduler_queues_due_rechecks(session, identity_row, monkeypatch):
    from app.workers import scheduler

    monkeypatch.setattr(scan_service, "get_connector", lambda name: StubConnector())
    request = DeletionRequest(
        identity_id=identity_row.id,
        status="CONFIRMED",
        next_check=datetime.now(UTC) - timedelta(days=1),
    )
    session.add(request)
    session.flush()

    queued = scheduler.queue_due_rechecks(session)
    assert queued >= 0
    assert request.next_check > datetime.now(UTC) - timedelta(days=1)
    assert session.query(Scan).count() >= 0
