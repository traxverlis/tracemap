"""Discovered accounts, findings and evidence."""

from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, HTTPException, Query, Response, status
from sqlalchemy import select

from app.api.deps import CurrentUser, DbSession, get_identity
from app.models import Account, Evidence, Finding
from app.schemas.osint import (
    AccountRead,
    AccountUpdate,
    EvidenceCreate,
    EvidenceRead,
    FindingCreate,
    FindingRead,
    FindingUpdate,
)
from app.services import audit

router = APIRouter(tags=["findings"])


def _get_finding(db, finding_id: str) -> Finding:
    finding = db.get(Finding, finding_id)
    if finding is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Finding not found")
    return finding


@router.get("/accounts", response_model=list[AccountRead])
def list_accounts(
    db: DbSession,
    user: CurrentUser,
    identity_id: str | None = None,
    status_filter: str | None = Query(default=None, alias="status"),
    platform: str | None = None,
):
    query = select(Account)
    if identity_id:
        query = query.where(Account.identity_id == identity_id)
    if status_filter:
        query = query.where(Account.status == status_filter)
    if platform:
        query = query.where(Account.platform == platform)
    return list(db.scalars(query.order_by(Account.confidence.desc(), Account.platform.asc())))


@router.patch("/accounts/{account_id}", response_model=AccountRead)
def update_account(account_id: str, payload: AccountUpdate, db: DbSession, user: CurrentUser):
    account = db.get(Account, account_id)
    if account is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")
    changes = payload.model_dump(exclude_unset=True)
    old_status = account.status
    notes = changes.pop("notes", None)
    for field, value in changes.items():
        setattr(account, field, value)
    if notes is not None:
        account.attributes = {**(account.attributes or {}), "notes": notes}
    db.flush()
    audit.record_change(
        db,
        action="account.updated",
        entity_type="account",
        entity_id=account.id,
        user_id=user.id,
        old_value={"status": old_status},
        new_value={"status": account.status},
        extra={"identity_id": account.identity_id},
    )
    return account


@router.get("/findings", response_model=list[FindingRead])
def list_findings(
    db: DbSession,
    user: CurrentUser,
    identity_id: str | None = None,
    category: str | None = None,
    status_filter: str | None = Query(default=None, alias="status"),
    q: str | None = Query(default=None, max_length=200),
):
    query = select(Finding)
    if identity_id:
        query = query.where(Finding.identity_id == identity_id)
    if category:
        query = query.where(Finding.category == category)
    if status_filter:
        query = query.where(Finding.status == status_filter)
    if q:
        query = query.where(Finding.title.contains(q.strip()))
    return list(db.scalars(query.order_by(Finding.discovered_at.desc().nullslast())))


@router.post("/findings", response_model=FindingRead, status_code=status.HTTP_201_CREATED)
def create_finding(payload: FindingCreate, db: DbSession, user: CurrentUser):
    get_identity(payload.identity_id, db)
    data = payload.model_dump()
    data.setdefault("discovered_at", None)
    finding = Finding(**data)
    if finding.discovered_at is None:
        finding.discovered_at = datetime.now(UTC)
    db.add(finding)
    db.flush()
    action = "data_broker.discovered" if finding.category == "data_broker" else "finding.created"
    audit.record(
        db,
        action=action,
        entity_type="finding",
        entity_id=finding.id,
        user_id=user.id,
        metadata={
            "identity_id": finding.identity_id,
            "category": finding.category,
            "source": finding.source,
        },
    )
    return finding


@router.patch("/findings/{finding_id}", response_model=FindingRead)
def update_finding(finding_id: str, payload: FindingUpdate, db: DbSession, user: CurrentUser):
    finding = _get_finding(db, finding_id)
    old_status = finding.status
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(finding, field, value)
    db.flush()
    action = "deletion.reappeared" if finding.status == "REAPPEARED" else "finding.updated"
    audit.record_change(
        db,
        action=action,
        entity_type="finding",
        entity_id=finding.id,
        user_id=user.id,
        old_value={"status": old_status},
        new_value={"status": finding.status},
        extra={"identity_id": finding.identity_id},
    )
    return finding


@router.delete("/findings/{finding_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_finding(finding_id: str, db: DbSession, user: CurrentUser) -> Response:
    finding = _get_finding(db, finding_id)
    db.delete(finding)
    audit.record(
        db,
        action="finding.deleted",
        entity_type="finding",
        entity_id=finding_id,
        user_id=user.id,
        metadata={"identity_id": finding.identity_id},
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/findings/{finding_id}/evidence", response_model=list[EvidenceRead])
def list_finding_evidence(finding_id: str, db: DbSession, user: CurrentUser):
    _get_finding(db, finding_id)
    return list(
        db.scalars(
            select(Evidence)
            .where(Evidence.finding_id == finding_id)
            .order_by(Evidence.captured_at.desc().nullslast())
        )
    )


@router.post(
    "/findings/{finding_id}/evidence",
    response_model=EvidenceRead,
    status_code=status.HTTP_201_CREATED,
)
def create_evidence(finding_id: str, payload: EvidenceCreate, db: DbSession, user: CurrentUser):
    finding = _get_finding(db, finding_id)
    evidence = Evidence(finding_id=finding.id, **payload.model_dump())
    if evidence.captured_at is None:
        evidence.captured_at = datetime.now(UTC)
    db.add(evidence)
    db.flush()
    audit.record(
        db,
        action="evidence.created",
        entity_type="evidence",
        entity_id=evidence.id,
        user_id=user.id,
        metadata={"identity_id": finding.identity_id, "finding_id": finding.id},
    )
    return evidence


@router.get("/evidence", response_model=list[EvidenceRead])
def list_evidence(db: DbSession, user: CurrentUser, identity_id: str | None = None):
    query = select(Evidence)
    if identity_id:
        query = query.join(Finding, Finding.id == Evidence.finding_id).where(
            Finding.identity_id == identity_id
        )
    return list(db.scalars(query.order_by(Evidence.captured_at.desc().nullslast())))
