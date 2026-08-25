"""Data brokers, opt-out / deletion tracking."""

from __future__ import annotations

import csv
from datetime import UTC, datetime, timedelta
from pathlib import Path

from fastapi import APIRouter, HTTPException, Query, Response, status
from sqlalchemy import select

from app.api.deps import CurrentUser, DbSession
from app.config import get_settings
from app.models import DataBroker, DeletionRequest
from app.schemas.privacy import (
    CatalogImportResponse,
    DataBrokerCreate,
    DataBrokerRead,
    DataBrokerUpdate,
    DeletionRequestCreate,
    DeletionRequestRead,
    DeletionRequestUpdate,
)
from app.services import audit

router = APIRouter(tags=["privacy"])

BOOL_TRUE = {"1", "true", "yes", "y", "oui"}


def _as_bool(value: str | None) -> bool:
    return (value or "").strip().lower() in BOOL_TRUE


@router.get("/data-brokers", response_model=list[DataBrokerRead])
def list_brokers(
    db: DbSession,
    user: CurrentUser,
    country: str | None = None,
    category: str | None = None,
    q: str | None = Query(default=None, max_length=200),
):
    query = select(DataBroker)
    if country:
        query = query.where(DataBroker.country == country)
    if category:
        query = query.where(DataBroker.category == category)
    if q:
        query = query.where(DataBroker.name.contains(q.strip()))
    return list(db.scalars(query.order_by(DataBroker.name.asc())))


@router.post("/data-brokers", response_model=DataBrokerRead, status_code=status.HTTP_201_CREATED)
def create_broker(payload: DataBrokerCreate, db: DbSession, user: CurrentUser):
    broker = DataBroker(**payload.model_dump())
    db.add(broker)
    db.flush()
    audit.record(
        db,
        action="data_broker.created",
        entity_type="data_broker",
        entity_id=broker.id,
        user_id=user.id,
        metadata={"name": broker.name},
    )
    return broker


@router.patch("/data-brokers/{broker_id}", response_model=DataBrokerRead)
def update_broker(broker_id: str, payload: DataBrokerUpdate, db: DbSession, user: CurrentUser):
    broker = db.get(DataBroker, broker_id)
    if broker is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Data broker not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(broker, field, value)
    db.flush()
    return broker


@router.delete("/data-brokers/{broker_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_broker(broker_id: str, db: DbSession, user: CurrentUser) -> Response:
    broker = db.get(DataBroker, broker_id)
    if broker is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Data broker not found")
    db.delete(broker)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/data-brokers/import", response_model=CatalogImportResponse)
def import_catalog(db: DbSession, user: CurrentUser):
    """Import ``data/data_brokers.csv``.

    Only URLs present in the operator-maintained CSV are used: the application
    never generates or guesses an opt-out URL.
    """
    settings = get_settings()
    path = Path(settings.data_dir) / "data_brokers.csv"
    if not path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Catalog not found: {path}. Fill it with verified opt-out URLs first.",
        )

    imported = 0
    skipped = 0
    with path.open(newline="", encoding="utf-8") as handle:
        for row in csv.DictReader(handle):
            name = (row.get("name") or "").strip()
            if not name:
                skipped += 1
                continue
            domain = (row.get("domain") or "").strip() or None
            existing = db.scalar(
                select(DataBroker).where(
                    DataBroker.name == name,
                    DataBroker.domain.is_(domain)
                    if domain is None
                    else DataBroker.domain == domain,
                )
            )
            if existing is not None:
                skipped += 1
                continue
            db.add(
                DataBroker(
                    name=name,
                    domain=domain,
                    country=(row.get("country") or "").strip() or None,
                    category=(row.get("category") or "").strip() or None,
                    search_url=(row.get("search_url") or "").strip() or None,
                    optout_url=(row.get("optout_url") or "").strip() or None,
                    optout_method=(row.get("optout_method") or "").strip() or None,
                    requires_email=_as_bool(row.get("requires_email")),
                    requires_phone=_as_bool(row.get("requires_phone")),
                    requires_identity_document=_as_bool(row.get("requires_identity_document")),
                    automation_possible=_as_bool(row.get("automation_possible")),
                    notes=(row.get("notes") or "").strip() or None,
                )
            )
            imported += 1

    db.flush()
    audit.record(
        db,
        action="data_broker.catalog_imported",
        entity_type="data_broker",
        entity_id=None,
        user_id=user.id,
        metadata={"imported": imported, "skipped": skipped},
    )
    return {"imported": imported, "skipped": skipped}


@router.get("/deletion-requests", response_model=list[DeletionRequestRead])
def list_deletions(
    db: DbSession,
    user: CurrentUser,
    identity_id: str | None = None,
    status_filter: str | None = Query(default=None, alias="status"),
):
    query = select(DeletionRequest)
    if identity_id:
        query = query.where(DeletionRequest.identity_id == identity_id)
    if status_filter:
        query = query.where(DeletionRequest.status == status_filter)
    return list(db.scalars(query.order_by(DeletionRequest.created_at.desc())))


@router.post(
    "/deletion-requests",
    response_model=DeletionRequestRead,
    status_code=status.HTTP_201_CREATED,
)
def create_deletion(payload: DeletionRequestCreate, db: DbSession, user: CurrentUser):
    """Track an opt-out request. Sending it stays a manual, human action."""
    data = payload.model_dump()
    request = DeletionRequest(**data)
    if request.next_check is None:
        settings = get_settings()
        request.next_check = datetime.now(UTC) + timedelta(days=settings.recheck_interval_days)
    db.add(request)
    db.flush()
    audit.record(
        db,
        action="deletion.created",
        entity_type="deletion_request",
        entity_id=request.id,
        user_id=user.id,
        metadata={"identity_id": request.identity_id, "status": request.status},
    )
    return request


@router.patch("/deletion-requests/{request_id}", response_model=DeletionRequestRead)
def update_deletion(
    request_id: str, payload: DeletionRequestUpdate, db: DbSession, user: CurrentUser
):
    request = db.get(DeletionRequest, request_id)
    if request is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Deletion request not found"
        )
    old_status = request.status
    changes = payload.model_dump(exclude_unset=True)
    for field, value in changes.items():
        setattr(request, field, value)

    if changes.get("status") == "REQUESTED" and request.requested_at is None:
        request.requested_at = datetime.now(UTC)
    if changes.get("status") == "CONFIRMED" and request.verified_at is None:
        request.verified_at = datetime.now(UTC)

    db.flush()
    action = {
        "REQUESTED": "deletion.requested",
        "CONFIRMED": "deletion.confirmed",
        "REAPPEARED": "deletion.reappeared",
    }.get(request.status, "deletion.updated")
    audit.record_change(
        db,
        action=action,
        entity_type="deletion_request",
        entity_id=request.id,
        user_id=user.id,
        old_value={"status": old_status},
        new_value={"status": request.status},
        extra={"identity_id": request.identity_id},
    )
    return request


@router.delete("/deletion-requests/{request_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_deletion(request_id: str, db: DbSession, user: CurrentUser) -> Response:
    request = db.get(DeletionRequest, request_id)
    if request is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Deletion request not found"
        )
    db.delete(request)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
