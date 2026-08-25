"""Professional history, domains, profiles and photos."""

from __future__ import annotations

from fastapi import APIRouter, File, Form, HTTPException, Response, UploadFile, status
from sqlalchemy import select

from app.api.deps import CurrentUser, DbSession, get_identity
from app.config import get_settings
from app.models import Company, Domain, Photo, Profile
from app.schemas.identity import (
    CompanyCreate,
    CompanyRead,
    CompanyUpdate,
    DomainCreate,
    DomainRead,
    DomainUpdate,
    PhotoRead,
    ProfileCreate,
    ProfileRead,
    ProfileUpdate,
)
from app.services import audit
from app.services.normalization import NormalizationError, normalize_domain
from app.services.photos import PhotoError, store_photo

router = APIRouter(tags=["inventory"])


def _get_or_404(db, model, entity_id: str, label: str):
    instance = db.get(model, entity_id)
    if instance is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"{label} not found")
    return instance


# --- Companies -------------------------------------------------------------


@router.get("/companies", response_model=list[CompanyRead])
def list_companies(db: DbSession, user: CurrentUser, identity_id: str | None = None):
    query = select(Company)
    if identity_id:
        query = query.where(Company.identity_id == identity_id)
    return list(db.scalars(query.order_by(Company.created_at.asc())))


@router.post("/companies", response_model=CompanyRead, status_code=status.HTTP_201_CREATED)
def create_company(payload: CompanyCreate, db: DbSession, user: CurrentUser):
    get_identity(payload.identity_id, db)
    company = Company(**payload.model_dump())
    db.add(company)
    db.flush()
    audit.record(
        db,
        action="company.created",
        entity_type="company",
        entity_id=company.id,
        user_id=user.id,
        metadata={"identity_id": company.identity_id, "name": company.name},
    )
    return company


@router.patch("/companies/{company_id}", response_model=CompanyRead)
def update_company(company_id: str, payload: CompanyUpdate, db: DbSession, user: CurrentUser):
    company = _get_or_404(db, Company, company_id, "Company")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(company, field, value)
    db.flush()
    return company


@router.delete("/companies/{company_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_company(company_id: str, db: DbSession, user: CurrentUser) -> Response:
    company = _get_or_404(db, Company, company_id, "Company")
    db.delete(company)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# --- Domains ---------------------------------------------------------------


@router.get("/domains", response_model=list[DomainRead])
def list_domains(db: DbSession, user: CurrentUser, identity_id: str | None = None):
    query = select(Domain)
    if identity_id:
        query = query.where(Domain.identity_id == identity_id)
    return list(db.scalars(query.order_by(Domain.domain.asc())))


@router.post("/domains", response_model=DomainRead, status_code=status.HTTP_201_CREATED)
def create_domain(payload: DomainCreate, db: DbSession, user: CurrentUser):
    get_identity(payload.identity_id, db)
    data = payload.model_dump()
    try:
        data["domain"] = normalize_domain(data["domain"])
    except NormalizationError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)
        ) from exc
    domain = Domain(**data)
    db.add(domain)
    db.flush()
    audit.record(
        db,
        action="domain.created",
        entity_type="domain",
        entity_id=domain.id,
        user_id=user.id,
        metadata={"identity_id": domain.identity_id, "domain": domain.domain},
    )
    return domain


@router.patch("/domains/{domain_id}", response_model=DomainRead)
def update_domain(domain_id: str, payload: DomainUpdate, db: DbSession, user: CurrentUser):
    domain = _get_or_404(db, Domain, domain_id, "Domain")
    changes = payload.model_dump(exclude_unset=True)
    if changes.get("domain"):
        try:
            changes["domain"] = normalize_domain(changes["domain"])
        except NormalizationError as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)
            ) from exc
    for field, value in changes.items():
        setattr(domain, field, value)
    db.flush()
    return domain


@router.delete("/domains/{domain_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_domain(domain_id: str, db: DbSession, user: CurrentUser) -> Response:
    domain = _get_or_404(db, Domain, domain_id, "Domain")
    db.delete(domain)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# --- Profiles --------------------------------------------------------------


@router.get("/profiles", response_model=list[ProfileRead])
def list_profiles(db: DbSession, user: CurrentUser, identity_id: str | None = None):
    query = select(Profile)
    if identity_id:
        query = query.where(Profile.identity_id == identity_id)
    return list(db.scalars(query.order_by(Profile.platform.asc())))


@router.post("/profiles", response_model=ProfileRead, status_code=status.HTTP_201_CREATED)
def create_profile(payload: ProfileCreate, db: DbSession, user: CurrentUser):
    get_identity(payload.identity_id, db)
    profile = Profile(**payload.model_dump())
    db.add(profile)
    db.flush()
    audit.record(
        db,
        action="profile.created",
        entity_type="profile",
        entity_id=profile.id,
        user_id=user.id,
        metadata={"identity_id": profile.identity_id, "platform": profile.platform},
    )
    return profile


@router.patch("/profiles/{profile_id}", response_model=ProfileRead)
def update_profile(profile_id: str, payload: ProfileUpdate, db: DbSession, user: CurrentUser):
    profile = _get_or_404(db, Profile, profile_id, "Profile")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(profile, field, value)
    db.flush()
    return profile


@router.delete("/profiles/{profile_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_profile(profile_id: str, db: DbSession, user: CurrentUser) -> Response:
    profile = _get_or_404(db, Profile, profile_id, "Profile")
    db.delete(profile)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# --- Photos ----------------------------------------------------------------


@router.get("/photos", response_model=list[PhotoRead])
def list_photos(db: DbSession, user: CurrentUser, identity_id: str | None = None):
    query = select(Photo)
    if identity_id:
        query = query.where(Photo.identity_id == identity_id)
    return list(db.scalars(query.order_by(Photo.created_at.desc())))


@router.post("/photos", response_model=PhotoRead, status_code=status.HTTP_201_CREATED)
async def upload_photo(
    db: DbSession,
    user: CurrentUser,
    identity_id: str = Form(...),
    file: UploadFile = File(...),
    platform: str | None = Form(default=None),
    source: str | None = Form(default=None),
    notes: str | None = Form(default=None),
):
    """Store one of *your own* images and hash it (no facial recognition)."""
    identity = get_identity(identity_id, db)
    settings = get_settings()
    payload = await file.read()
    try:
        stored = store_photo(
            payload,
            file.filename or "photo",
            file.content_type,
            settings.photos_dir,
            settings.max_upload_bytes,
        )
    except PhotoError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)
        ) from exc

    photo = Photo(
        identity_id=identity.id,
        platform=platform,
        source=source,
        notes=notes,
        **stored,
    )
    db.add(photo)
    db.flush()
    audit.record(
        db,
        action="photo.created",
        entity_type="photo",
        entity_id=photo.id,
        user_id=user.id,
        metadata={"identity_id": identity.id, "sha256": photo.sha256},
    )
    return photo


@router.delete("/photos/{photo_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_photo(photo_id: str, db: DbSession, user: CurrentUser) -> Response:
    photo = _get_or_404(db, Photo, photo_id, "Photo")
    db.delete(photo)
    audit.record(
        db,
        action="photo.deleted",
        entity_type="photo",
        entity_id=photo_id,
        user_id=user.id,
        metadata={"identity_id": photo.identity_id},
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
