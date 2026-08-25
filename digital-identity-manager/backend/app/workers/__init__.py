"""Background workers (database-backed queue, no external broker)."""

from __future__ import annotations

import logging

from app.config import get_settings
from app.workers.scan_worker import ScanWorker, process_once
from app.workers.scheduler import RecheckScheduler, queue_due_rechecks

logger = logging.getLogger(__name__)

_threads: list[ScanWorker | RecheckScheduler] = []


def start_workers() -> None:
    """Start the workers unless disabled (tests, one-shot commands)."""
    settings = get_settings()
    if not settings.workers_enabled or _threads:
        return
    workers: list[ScanWorker | RecheckScheduler] = [ScanWorker(), RecheckScheduler()]
    for worker in workers:
        worker.start()
        _threads.append(worker)
    logger.info("workers.started", extra={"count": len(_threads)})


def stop_workers() -> None:
    while _threads:
        worker = _threads.pop()
        worker.stop()


__all__ = [
    "RecheckScheduler",
    "ScanWorker",
    "process_once",
    "queue_due_rechecks",
    "start_workers",
    "stop_workers",
]
