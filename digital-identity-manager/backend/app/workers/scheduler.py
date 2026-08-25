"""Re-check scheduler.

Deleted data has a habit of coming back. For every deletion request whose
``next_check`` is due, the scheduler queues a re-check scan against the original
finding so a reappearance is detected and surfaced on the dashboard.
"""

from __future__ import annotations

import logging
import threading
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import SessionLocal
from app.models import DataBroker, DeletionRequest, Finding, Scan
from app.services import audit

logger = logging.getLogger(__name__)


def _now() -> datetime:
    return datetime.now(UTC)


def queue_due_rechecks(db: Session) -> int:
    """Queue a re-check scan for every due deletion request."""
    settings = get_settings()
    now = _now()
    due = list(
        db.scalars(
            select(DeletionRequest).where(
                DeletionRequest.status.in_(["CONFIRMED", "REQUESTED", "IN_PROGRESS"]),
                DeletionRequest.next_check.is_not(None),
                DeletionRequest.next_check <= now,
            )
        )
    )
    queued = 0
    for request in due:
        target = None
        if request.finding_id:
            finding = db.get(Finding, request.finding_id)
            target = finding.url or finding.value if finding else None
        if not target and request.broker_id:
            broker = db.get(DataBroker, request.broker_id)
            target = broker.search_url or broker.domain if broker else None
        if not target:
            request.next_check = now + timedelta(days=settings.recheck_interval_days)
            continue

        db.add(
            Scan(
                identity_id=request.identity_id,
                scan_type="recheck",
                target=target,
                tool="manual",
                status="PENDING",
                scheduled_for=now,
                parameters_json={
                    "deletion_request_id": request.id,
                    "reason": "verify that removed data did not reappear",
                },
            )
        )
        request.next_check = now + timedelta(days=settings.recheck_interval_days)
        audit.record(
            db,
            action="deletion.recheck_queued",
            entity_type="deletion_request",
            entity_id=request.id,
            metadata={"identity_id": request.identity_id, "target": target},
        )
        queued += 1
    db.commit()
    return queued


class RecheckScheduler(threading.Thread):
    """Periodically queues due re-checks."""

    def __init__(self, poll_seconds: int | None = None) -> None:
        super().__init__(name="dim-recheck-scheduler", daemon=True)
        settings = get_settings()
        self.poll_seconds = poll_seconds or settings.recheck_poll_seconds
        self._stop_event = threading.Event()

    def stop(self) -> None:
        self._stop_event.set()

    def run(self) -> None:  # pragma: no cover - thread loop
        while not self._stop_event.is_set():
            session = SessionLocal()
            try:
                queued = queue_due_rechecks(session)
                if queued:
                    logger.info("scheduler.rechecks_queued", extra={"count": queued})
            except Exception:
                session.rollback()
                logger.exception("scheduler.iteration_failed")
            finally:
                session.close()
            self._stop_event.wait(self.poll_seconds)
