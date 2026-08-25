"""Settings, data export and full erasure."""

from __future__ import annotations

import json

from fastapi import APIRouter, HTTPException, Response, status
from sqlalchemy import select

from app.api.deps import CurrentUser, DbSession, get_identity
from app.config import get_settings
from app.connectors import describe_connectors
from app.llm import IdentityAssistant
from app.models import Identity
from app.schemas.privacy import EraseRequest, EraseResponse, SettingsResponse
from app.services import audit
from app.services import privacy as privacy_service

router = APIRouter(tags=["settings"])


@router.get("/settings", response_model=SettingsResponse)
def read_settings(user: CurrentUser):
    """Read-only view of the deployment configuration (never returns secrets)."""
    settings = get_settings()
    return {
        "environment": settings.environment,
        "ai": IdentityAssistant().status(),
        "tools": describe_connectors(),
        "correlation": {
            "max_auto_score": settings.correlation_auto_max_score,
            "suggest_threshold": settings.correlation_suggest_threshold,
        },
        "storage": {
            "evidence_dir": settings.evidence_dir,
            "reports_dir": settings.reports_dir,
        },
    }


@router.get("/settings/export")
def export_identity(
    db: DbSession,
    user: CurrentUser,
    identity_id: str | None = None,
) -> Response:
    """Download everything the application knows, for one or every identity."""
    if identity_id is None:
        identities = list(db.scalars(select(Identity).order_by(Identity.created_at)))
    else:
        identities = [get_identity(identity_id, db)]

    exports = [privacy_service.export_identity(db, identity) for identity in identities]
    payload: dict[str, object] = (
        exports[0] if identity_id is not None and exports else {"identities": exports}
    )
    audit.record(
        db,
        action="privacy.exported",
        entity_type="identity",
        entity_id=identity_id,
        user_id=user.id,
        metadata={"identity_id": identity_id, "identities": len(identities)},
    )
    body = json.dumps(payload, indent=2, ensure_ascii=False, default=str)
    filename = f"identity-{identity_id}.json" if identity_id else "identities.json"
    return Response(
        content=body,
        media_type="application/json",
        headers={"content-disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/settings/erase", response_model=EraseResponse)
def erase(payload: EraseRequest, db: DbSession, user: CurrentUser):
    """Right to erasure: wipe one identity, or the whole inventory."""
    if payload.confirm != "ERASE":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Send confirm='ERASE' to acknowledge this irreversible action.",
        )

    identities = (
        [get_identity(payload.identity_id, db)]
        if payload.identity_id
        else list(db.scalars(select(Identity)))
    )

    deleted: dict[str, int] = {}
    for identity in identities:
        for table, count in privacy_service.erase_identity(db, identity).items():
            deleted[table] = deleted.get(table, 0) + count

    audit.record(
        db,
        action="privacy.erased",
        entity_type="identity",
        entity_id=payload.identity_id,
        user_id=user.id,
        metadata={"identity_id": payload.identity_id, "deleted": deleted},
    )
    return {"deleted": deleted}
