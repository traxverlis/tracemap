"""Dashboard summary, identity graph and timeline."""

from __future__ import annotations

from fastapi import APIRouter, Query

from app.api.deps import CurrentUser, DbSession, get_identity
from app.schemas.osint import TimelineEvent
from app.schemas.privacy import DashboardSummary
from app.services import dashboard as dashboard_service
from app.services import timeline as timeline_service

router = APIRouter(tags=["overview"])


@router.get("/dashboard/summary", response_model=DashboardSummary)
def dashboard(identity_id: str, db: DbSession, user: CurrentUser):
    identity = get_identity(identity_id, db)
    return dashboard_service.build_summary(db, identity)


@router.get("/timeline", response_model=list[TimelineEvent])
def timeline(
    db: DbSession,
    user: CurrentUser,
    identity_id: str | None = None,
    limit: int = Query(default=100, ge=1, le=500),
):
    return timeline_service.build_timeline(db, identity_id, limit)
