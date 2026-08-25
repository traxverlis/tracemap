"""Identity, completeness and identifier endpoints."""

from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, HTTPException, Query, Response, status
from sqlalchemy import select

from app.api.deps import CurrentUser, DbSession, get_identity
from app.models import CompletenessTarget, Identifier, Identity
from app.schemas.identity import (
    AuthorizationAck,
    Completeness,
    CompletenessTargetsUpdate,
    IdentifierCreate,
    IdentifierRead,
    IdentifierUpdate,
    IdentityCreate,
    IdentityRead,
    IdentityUpdate,
)
from app.services import audit
from app.services import completeness as completeness_service
from app.services.normalization import NormalizationError, normalize_identifier

router = APIRouter(tags=["identity"])


def _normalize(identifier_type: str, value: str, country: str | None) -> str:
    try:
        return normalize_identifier(identifier_type, value, country)
    except NormalizationError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)
        ) from exc


@router.get("/identities", response_model=list[IdentityRead])
def list_identities(db: DbSession, user: CurrentUser) -> list[Identity]:
    return list(db.scalars(select(Identity).order_by(Identity.created_at.asc())))


@router.post("/identities", response_model=IdentityRead, status_code=status.HTTP_201_CREATED)
def create_identity(payload: IdentityCreate, db: DbSession, user: CurrentUser) -> Identity:
    identity = Identity(**payload.model_dump())
    db.add(identity)
    db.flush()
    audit.record(
        db,
        action="identity.created",
        entity_type="identity",
        entity_id=identity.id,
        user_id=user.id,
        metadata={"identity_id": identity.id, "label": identity.label},
    )
    return identity


@router.get("/identities/{identity_id}", response_model=IdentityRead)
def read_identity(identity_id: str, db: DbSession, user: CurrentUser) -> Identity:
    return get_identity(identity_id, db)


@router.patch("/identities/{identity_id}", response_model=IdentityRead)
def update_identity(
    identity_id: str, payload: IdentityUpdate, db: DbSession, user: CurrentUser
) -> Identity:
    identity = get_identity(identity_id, db)
    changes = payload.model_dump(exclude_unset=True)
    for field, value in changes.items():
        setattr(identity, field, value)
    db.flush()
    audit.record(
        db,
        action="identity.updated",
        entity_type="identity",
        entity_id=identity.id,
        user_id=user.id,
        metadata={"identity_id": identity.id, "fields": sorted(changes)},
    )
    return identity


@router.delete("/identities/{identity_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_identity(identity_id: str, db: DbSession, user: CurrentUser) -> Response:
    identity = get_identity(identity_id, db)
    db.delete(identity)
    audit.record(
        db,
        action="identity.deleted",
        entity_type="identity",
        entity_id=identity_id,
        user_id=user.id,
        metadata={"identity_id": identity_id},
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/identities/{identity_id}/authorization", response_model=IdentityRead)
def acknowledge_authorization(
    identity_id: str, payload: AuthorizationAck, db: DbSession, user: CurrentUser
) -> Identity:
    """Record that the operator owns this identity or is authorised to audit it."""
    identity = get_identity(identity_id, db)
    identity.authorization_ack = payload.acknowledged
    identity.authorization_ack_at = datetime.now(UTC) if payload.acknowledged else None
    db.flush()
    audit.record(
        db,
        action="identity.authorization",
        entity_type="identity",
        entity_id=identity.id,
        user_id=user.id,
        metadata={"identity_id": identity.id, "acknowledged": payload.acknowledged},
    )
    return identity


@router.get("/identities/{identity_id}/completeness", response_model=Completeness)
def read_completeness(identity_id: str, db: DbSession, user: CurrentUser) -> dict:
    identity = get_identity(identity_id, db)
    return completeness_service.compute(db, identity)


@router.put("/identities/{identity_id}/completeness-targets", response_model=Completeness)
def update_targets(
    identity_id: str,
    payload: CompletenessTargetsUpdate,
    db: DbSession,
    user: CurrentUser,
) -> dict:
    identity = get_identity(identity_id, db)
    known = {category.key for category in completeness_service.CATEGORIES}
    for item in payload.targets:
        if item.category not in known:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"unknown category: {item.category}",
            )
        target = db.scalar(
            select(CompletenessTarget).where(
                CompletenessTarget.identity_id == identity.id,
                CompletenessTarget.category == item.category,
            )
        )
        if target is None:
            db.add(
                CompletenessTarget(
                    identity_id=identity.id,
                    category=item.category,
                    expected_count=item.expected_count,
                )
            )
        else:
            target.expected_count = item.expected_count
    db.flush()
    audit.record(
        db,
        action="identity.targets_updated",
        entity_type="identity",
        entity_id=identity.id,
        user_id=user.id,
        metadata={"identity_id": identity.id},
    )
    return completeness_service.compute(db, identity)


@router.get("/identifiers", response_model=list[IdentifierRead])
def list_identifiers(
    db: DbSession,
    user: CurrentUser,
    identity_id: str | None = None,
    type: str | None = None,
    is_active: bool | None = None,
    q: str | None = Query(default=None, max_length=200),
) -> list[Identifier]:
    query = select(Identifier)
    if identity_id:
        query = query.where(Identifier.identity_id == identity_id)
    if type:
        query = query.where(Identifier.type == type)
    if is_active is not None:
        query = query.where(Identifier.is_active.is_(is_active))
    if q:
        query = query.where(Identifier.normalized_value.contains(q.strip().lower()))
    return list(db.scalars(query.order_by(Identifier.type.asc(), Identifier.created_at.asc())))


@router.post("/identifiers", response_model=IdentifierRead, status_code=status.HTTP_201_CREATED)
def create_identifier(payload: IdentifierCreate, db: DbSession, user: CurrentUser) -> Identifier:
    identity = get_identity(payload.identity_id, db)
    data = payload.model_dump()
    country = data.pop("country", None) or identity.country
    normalized = _normalize(data["type"], data["value"], country)

    existing = db.scalar(
        select(Identifier).where(
            Identifier.identity_id == identity.id,
            Identifier.type == data["type"],
            Identifier.normalized_value == normalized,
        )
    )
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This identifier is already part of the inventory.",
        )

    now = datetime.now(UTC)
    identifier = Identifier(**data, normalized_value=normalized, first_seen=now, last_seen=now)
    db.add(identifier)
    db.flush()
    audit.record(
        db,
        action="identifier.created",
        entity_type="identifier",
        entity_id=identifier.id,
        user_id=user.id,
        # The value itself is never written to the audit log.
        metadata={"identity_id": identity.id, "type": identifier.type},
    )
    return identifier


@router.get("/identifiers/{identifier_id}", response_model=IdentifierRead)
def read_identifier(identifier_id: str, db: DbSession, user: CurrentUser) -> Identifier:
    identifier = db.get(Identifier, identifier_id)
    if identifier is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Identifier not found")
    return identifier


@router.patch("/identifiers/{identifier_id}", response_model=IdentifierRead)
def update_identifier(
    identifier_id: str, payload: IdentifierUpdate, db: DbSession, user: CurrentUser
) -> Identifier:
    identifier = read_identifier(identifier_id, db, user)
    changes = payload.model_dump(exclude_unset=True)
    country = changes.pop("country", None)
    if "value" in changes and changes["value"]:
        identifier.normalized_value = _normalize(identifier.type, changes["value"], country)
    for field, value in changes.items():
        setattr(identifier, field, value)
    identifier.last_seen = datetime.now(UTC)
    db.flush()
    audit.record(
        db,
        action="identifier.updated",
        entity_type="identifier",
        entity_id=identifier.id,
        user_id=user.id,
        metadata={"identity_id": identifier.identity_id, "fields": sorted(changes)},
    )
    return identifier


@router.delete("/identifiers/{identifier_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_identifier(identifier_id: str, db: DbSession, user: CurrentUser) -> Response:
    identifier = read_identifier(identifier_id, db, user)
    identity_id = identifier.identity_id
    db.delete(identifier)
    audit.record(
        db,
        action="identifier.deleted",
        entity_type="identifier",
        entity_id=identifier_id,
        user_id=user.id,
        metadata={"identity_id": identity_id},
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
