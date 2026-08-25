"""OSINT scan orchestration endpoints."""

from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select

from app.api.deps import CurrentUser, DbSession, get_identity
from app.connectors import describe_connectors
from app.models import Scan, ScanResult
from app.schemas.osint import (
    PromoteRequest,
    PromoteResponse,
    ScanCreate,
    ScanRead,
    ScanResultRead,
    ToolDescriptor,
)
from app.services import audit
from app.services import scans as scan_service

router = APIRouter(tags=["scans"])


def _serialise(db, scan: Scan) -> dict:
    payload = ScanRead.model_validate(scan).model_dump()
    payload["result_count"] = scan_service.result_count(db, scan.id)
    return payload


def _get_scan(db, scan_id: str) -> Scan:
    scan = db.get(Scan, scan_id)
    if scan is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scan not found")
    return scan


@router.get("/scans/tools", response_model=list[ToolDescriptor])
def list_tools(user: CurrentUser):
    """Which OSINT connectors are wired in this deployment."""
    return describe_connectors()


@router.get("/scans", response_model=list[ScanRead])
def list_scans(
    db: DbSession,
    user: CurrentUser,
    identity_id: str | None = None,
    status_filter: str | None = Query(default=None, alias="status"),
    tool: str | None = None,
    limit: int = Query(default=100, ge=1, le=500),
):
    query = select(Scan)
    if identity_id:
        query = query.where(Scan.identity_id == identity_id)
    if status_filter:
        query = query.where(Scan.status == status_filter)
    if tool:
        query = query.where(Scan.tool == tool)
    scans = list(db.scalars(query.order_by(Scan.created_at.desc()).limit(limit)))
    return [_serialise(db, scan) for scan in scans]


@router.post("/scans", response_model=ScanRead, status_code=status.HTTP_201_CREATED)
def create_scan(payload: ScanCreate, db: DbSession, user: CurrentUser):
    identity = get_identity(payload.identity_id, db)
    try:
        scan = scan_service.create_scan(
            db,
            identity=identity,
            tool=payload.tool,
            scan_type=payload.scan_type,
            target=payload.target,
            parameters=payload.parameters_json,
            user_id=user.id,
        )
    except scan_service.AuthorizationRequired as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except scan_service.ScanError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)
        ) from exc
    return _serialise(db, scan)


@router.get("/scans/{scan_id}", response_model=ScanRead)
def read_scan(scan_id: str, db: DbSession, user: CurrentUser):
    return _serialise(db, _get_scan(db, scan_id))


@router.get("/scans/{scan_id}/results", response_model=list[ScanResultRead])
def read_scan_results(scan_id: str, db: DbSession, user: CurrentUser):
    _get_scan(db, scan_id)
    return list(
        db.scalars(
            select(ScanResult)
            .where(ScanResult.scan_id == scan_id)
            .order_by(ScanResult.confidence.desc(), ScanResult.value.asc())
        )
    )


@router.post("/scans/{scan_id}/promote", response_model=PromoteResponse)
def promote(scan_id: str, payload: PromoteRequest, db: DbSession, user: CurrentUser):
    """Turn selected raw results into accounts / findings (human curated)."""
    scan = _get_scan(db, scan_id)
    accounts, findings = scan_service.promote_results(db, scan, payload.result_ids, user.id)
    return {"accounts_created": accounts, "findings_created": findings}


@router.post("/scans/{scan_id}/cancel", response_model=ScanRead)
def cancel(scan_id: str, db: DbSession, user: CurrentUser):
    scan = _get_scan(db, scan_id)
    if scan.status not in {"PENDING", "RUNNING"}:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A {scan.status.lower()} scan cannot be cancelled.",
        )
    scan.status = "CANCELLED"
    scan.finished_at = datetime.now(UTC)
    db.flush()
    audit.record(
        db,
        action="scan.cancelled",
        entity_type="scan",
        entity_id=scan.id,
        user_id=user.id,
        metadata={"identity_id": scan.identity_id, "tool": scan.tool},
    )
    return _serialise(db, scan)
