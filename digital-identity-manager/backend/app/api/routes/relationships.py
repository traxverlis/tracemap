"""Relationships, human validation queue and the correlation engine."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query, Response, status
from sqlalchemy import select

from app.api.deps import CurrentUser, DbSession, get_identity
from app.correlation import engine, rules_payload
from app.models import Relationship
from app.schemas.osint import (
    CorrelationRules,
    CorrelationRunRequest,
    CorrelationRunResponse,
    GraphResponse,
    RelationshipCreate,
    RelationshipDecision,
    RelationshipRead,
    ReviewItem,
)
from app.services import audit
from app.services import graph as graph_service
from app.services import relationships as relationship_service

router = APIRouter(tags=["relationships"])


@router.get("/relationships", response_model=list[RelationshipRead])
def list_relationships(
    db: DbSession,
    user: CurrentUser,
    identity_id: str | None = None,
    status_filter: str | None = Query(default=None, alias="status"),
    relationship_type: str | None = None,
):
    query = select(Relationship)
    if identity_id:
        query = query.where(Relationship.identity_id == identity_id)
    if status_filter:
        query = query.where(Relationship.status == status_filter)
    if relationship_type:
        query = query.where(Relationship.relationship_type == relationship_type)
    return list(db.scalars(query.order_by(Relationship.confidence.desc())))


@router.post("/relationships", response_model=RelationshipRead, status_code=status.HTTP_201_CREATED)
def create_relationship(payload: RelationshipCreate, db: DbSession, user: CurrentUser):
    relationship = Relationship(**payload.model_dump())
    db.add(relationship)
    db.flush()
    audit.record(
        db,
        action="relationship.created",
        entity_type="relationship",
        entity_id=relationship.id,
        user_id=user.id,
        metadata={
            "identity_id": relationship.identity_id,
            "relationship_type": relationship.relationship_type,
        },
    )
    return relationship


@router.get("/relationships/review", response_model=list[ReviewItem])
def review_queue(db: DbSession, user: CurrentUser, identity_id: str | None = None):
    """Suggested correlations awaiting an explicit human decision."""
    return relationship_service.build_review_queue(db, identity_id)


@router.get("/relationships/graph", response_model=GraphResponse)
def graph(identity_id: str, db: DbSession, user: CurrentUser):
    """Identity graph: entities and their (human validated) relationships."""
    identity = get_identity(identity_id, db)
    return graph_service.build_graph(db, identity)


@router.post("/relationships/{relationship_id}/decision", response_model=RelationshipRead)
def decide(
    relationship_id: str,
    payload: RelationshipDecision,
    db: DbSession,
    user: CurrentUser,
):
    relationship = db.get(Relationship, relationship_id)
    if relationship is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Relationship not found")
    try:
        return relationship_service.apply_decision(
            db, relationship, payload.decision, user.id, payload.reason
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)
        ) from exc


@router.delete("/relationships/{relationship_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_relationship(relationship_id: str, db: DbSession, user: CurrentUser) -> Response:
    relationship = db.get(Relationship, relationship_id)
    if relationship is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Relationship not found")
    db.delete(relationship)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/correlation/run", response_model=CorrelationRunResponse)
def run_correlation(payload: CorrelationRunRequest, db: DbSession, user: CurrentUser):
    identity = get_identity(payload.identity_id, db)
    relationships, created, updated = engine.run_correlation(db, identity)
    audit.record(
        db,
        action="correlation.run",
        entity_type="identity",
        entity_id=identity.id,
        user_id=user.id,
        metadata={"identity_id": identity.id, "created": created, "updated": updated},
    )
    return {"created": created, "updated": updated, "relationships": relationships}


@router.get("/correlation/rules", response_model=CorrelationRules)
def correlation_rules(user: CurrentUser):
    """Expose the scoring method so every score stays explainable."""
    return rules_payload()
