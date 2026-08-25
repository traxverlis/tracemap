"""Optional identity assistant (LLM) endpoints — always human validated."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select

from app.api.deps import CurrentUser, DbSession, get_identity
from app.llm import IdentityAssistant, LLMDisabledError, LLMError
from app.models import AISuggestion
from app.schemas.privacy import (
    AIStatus,
    AISuggestionDecision,
    AISuggestionRead,
    AISuggestRequest,
)
from app.services import ai as ai_service

router = APIRouter(tags=["ai"])


@router.get("/ai/status", response_model=AIStatus)
def ai_status(user: CurrentUser):
    return IdentityAssistant().status()


@router.post(
    "/ai/suggest", response_model=list[AISuggestionRead], status_code=status.HTTP_201_CREATED
)
def suggest(payload: AISuggestRequest, db: DbSession, user: CurrentUser):
    """Ask the assistant for suggestions; nothing is applied automatically."""
    identity = get_identity(payload.identity_id, db)
    try:
        return ai_service.run_task(db, identity, payload.task, user.id)
    except LLMDisabledError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"{exc} Set LLM_PROVIDER and the matching API key to enable it.",
        ) from exc
    except LLMError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc


@router.get("/ai/suggestions", response_model=list[AISuggestionRead])
def list_suggestions(
    db: DbSession,
    user: CurrentUser,
    identity_id: str | None = None,
    status_filter: str | None = Query(default=None, alias="status"),
):
    query = select(AISuggestion)
    if status_filter:
        query = query.where(AISuggestion.status == status_filter)
    suggestions = list(db.scalars(query.order_by(AISuggestion.created_at.desc())))
    if identity_id:
        suggestions = [
            item
            for item in suggestions
            if (item.payload_json or {}).get("identity_id") == identity_id
        ]
    return suggestions


@router.post("/ai/suggestions/{suggestion_id}/decision", response_model=AISuggestionRead)
def decide(
    suggestion_id: str,
    payload: AISuggestionDecision,
    db: DbSession,
    user: CurrentUser,
):
    suggestion = db.get(AISuggestion, suggestion_id)
    if suggestion is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Suggestion not found")
    try:
        return ai_service.apply_decision(db, suggestion, payload.decision, user.id, payload.reason)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)
        ) from exc
