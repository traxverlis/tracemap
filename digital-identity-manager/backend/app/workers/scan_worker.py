"""Background scan worker.

Scans are queued in PostgreSQL (``scans.status = 'PENDING'``) and executed by a
small polling worker thread. Using the database as the queue keeps the stack
dependency-free (no broker) and makes a restart safe: an interrupted scan is
simply picked up again.
"""

from __future__ import annotations

import logging
import threading
from datetime import UTC, datetime

from sqlalchemy import select

from app.config import get_settings
from app.database import SessionLocal
from app.models import Scan
from app.services import scans as scan_service

logger = logging.getLogger(__name__)


def claim_next_scan(session) -> Scan | None:
    """Atomically claim the oldest pending scan that is due."""
    now = datetime.now(UTC)
    query = (
        select(Scan)
        .where(Scan.status == "PENDING")
        .order_by(Scan.created_at.asc())
        .limit(1)
        .with_for_update(skip_locked=True)
    )
    try:
        scan = session.scalars(query).first()
    except Exception:  # pragma: no cover - SQLite has no SELECT ... FOR UPDATE
        scan = session.scalars(
            select(Scan).where(Scan.status == "PENDING").order_by(Scan.created_at.asc()).limit(1)
        ).first()
    if scan is None:
        return None
    if scan.scheduled_for and scan.scheduled_for > now:
        return None
    scan.status = "RUNNING"
    scan.started_at = now
    session.commit()
    return scan


def process_once() -> bool:
    """Execute at most one pending scan. Returns ``True`` when one ran."""
    session = SessionLocal()
    try:
        scan = claim_next_scan(session)
        if scan is None:
            return False
        scan_service.execute_scan(session, scan)
        session.commit()
        return True
    except Exception:  # pragma: no cover - defensive
        session.rollback()
        logger.exception("worker.scan_failed")
        return False
    finally:
        session.close()


class ScanWorker(threading.Thread):
    """Polls the scan queue until stopped."""

    def __init__(self, poll_seconds: int | None = None) -> None:
        super().__init__(name="dim-scan-worker", daemon=True)
        settings = get_settings()
        self.poll_seconds = poll_seconds or settings.worker_poll_seconds
        self._stop_event = threading.Event()

    def stop(self) -> None:
        self._stop_event.set()

    def run(self) -> None:  # pragma: no cover - thread loop
        logger.info("worker.started", extra={"poll_seconds": self.poll_seconds})
        while not self._stop_event.is_set():
            try:
                worked = process_once()
            except Exception:
                logger.exception("worker.iteration_failed")
                worked = False
            if not worked:
                self._stop_event.wait(self.poll_seconds)
        logger.info("worker.stopped")
