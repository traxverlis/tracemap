"""Identity inventory schemas."""

from __future__ import annotations

from datetime import date, datetime
from typing import Any, Literal

from pydantic import BaseModel, Field

from app.schemas.common import ORMModel

IdentifierTypeLiteral = Literal["email", "phone", "username", "name", "address", "domain"]


class IdentityAttributes(BaseModel):
    name_variants: list[str] = Field(default_factory=list)
    known_aliases: list[str] = Field(default_factory=list)
    cities: list[str] = Field(default_factory=list)
    notes: str | None = None


class IdentityBase(BaseModel):
    label: str = Field(min_length=1, max_length=200)
    description: str | None = None
    first_name: str | None = Field(default=None, max_length=120)
    last_name: str | None = Field(default=None, max_length=120)
    birth_date: date | None = None
    country: str | None = Field(default=None, min_length=2, max_length=2)
    attributes: dict[str, Any] = Field(default_factory=dict)


class IdentityCreate(IdentityBase):
    pass


class IdentityUpdate(BaseModel):
    label: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = None
    first_name: str | None = Field(default=None, max_length=120)
    last_name: str | None = Field(default=None, max_length=120)
    birth_date: date | None = None
    country: str | None = Field(default=None, min_length=2, max_length=2)
    attributes: dict[str, Any] | None = None


class IdentityRead(IdentityBase, ORMModel):
    id: str
    authorization_ack: bool
    authorization_ack_at: datetime | None
    created_at: datetime
    updated_at: datetime


class AuthorizationAck(BaseModel):
    acknowledged: bool


class IdentifierBase(BaseModel):
    type: IdentifierTypeLiteral
    value: str = Field(min_length=1, max_length=512)
    subtype: str | None = Field(default=None, max_length=64)
    label: str | None = Field(default=None, max_length=120)
    is_active: bool = True
    confidence: int = Field(default=100, ge=0, le=100)
    valid_from: date | None = None
    valid_to: date | None = None
    source_id: str | None = None
    notes: str | None = None
    attributes: dict[str, Any] = Field(default_factory=dict)


class IdentifierCreate(IdentifierBase):
    identity_id: str
    country: str | None = Field(default=None, max_length=2, description="Hint for phone parsing")


class IdentifierUpdate(BaseModel):
    value: str | None = Field(default=None, min_length=1, max_length=512)
    subtype: str | None = Field(default=None, max_length=64)
    label: str | None = Field(default=None, max_length=120)
    is_active: bool | None = None
    confidence: int | None = Field(default=None, ge=0, le=100)
    valid_from: date | None = None
    valid_to: date | None = None
    source_id: str | None = None
    notes: str | None = None
    attributes: dict[str, Any] | None = None
    country: str | None = Field(default=None, max_length=2)


class IdentifierRead(IdentifierBase, ORMModel):
    id: str
    identity_id: str
    normalized_value: str
    first_seen: datetime | None
    last_seen: datetime | None
    created_at: datetime
    updated_at: datetime


class CompanyBase(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    position: str | None = Field(default=None, max_length=200)
    website: str | None = Field(default=None, max_length=512)
    professional_profile_url: str | None = Field(default=None, max_length=512)
    professional_domain: str | None = Field(default=None, max_length=255)
    valid_from: date | None = None
    valid_to: date | None = None
    is_former: bool = False
    notes: str | None = None


class CompanyCreate(CompanyBase):
    identity_id: str


class CompanyUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    position: str | None = None
    website: str | None = None
    professional_profile_url: str | None = None
    professional_domain: str | None = None
    valid_from: date | None = None
    valid_to: date | None = None
    is_former: bool | None = None
    notes: str | None = None


class CompanyRead(CompanyBase, ORMModel):
    id: str
    identity_id: str
    created_at: datetime
    updated_at: datetime


class DomainBase(BaseModel):
    domain: str = Field(min_length=1, max_length=255)
    known_owner: str | None = Field(default=None, max_length=200)
    registrar: str | None = Field(default=None, max_length=200)
    status: str | None = Field(default=None, max_length=64)
    valid_from: date | None = None
    valid_to: date | None = None
    notes: str | None = None


class DomainCreate(DomainBase):
    identity_id: str


class DomainUpdate(BaseModel):
    domain: str | None = Field(default=None, min_length=1, max_length=255)
    known_owner: str | None = None
    registrar: str | None = None
    status: str | None = None
    valid_from: date | None = None
    valid_to: date | None = None
    notes: str | None = None


class DomainRead(DomainBase, ORMModel):
    id: str
    identity_id: str
    attributes: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime
    updated_at: datetime


class ProfileBase(BaseModel):
    platform: str = Field(min_length=1, max_length=120)
    username: str | None = Field(default=None, max_length=255)
    url: str | None = Field(default=None, max_length=512)
    is_active: bool = True
    is_public: bool = True
    notes: str | None = None


class ProfileCreate(ProfileBase):
    identity_id: str


class ProfileUpdate(BaseModel):
    platform: str | None = Field(default=None, min_length=1, max_length=120)
    username: str | None = None
    url: str | None = None
    is_active: bool | None = None
    is_public: bool | None = None
    notes: str | None = None


class ProfileRead(ProfileBase, ORMModel):
    id: str
    identity_id: str
    created_at: datetime
    updated_at: datetime


class PhotoRead(ORMModel):
    id: str
    identity_id: str
    filename: str
    storage_path: str
    sha256: str
    perceptual_hash: str | None
    content_type: str | None
    size_bytes: int | None
    platform: str | None
    source: str | None
    notes: str | None
    created_at: datetime


class CompletenessCategory(BaseModel):
    category: str
    label: str
    known: int
    expected: int
    ratio: float
    weight: float
    missing: int


class Completeness(BaseModel):
    score: int
    explanation: str
    categories: list[CompletenessCategory]


class CompletenessTargetItem(BaseModel):
    category: str
    expected_count: int = Field(ge=0, le=1000)


class CompletenessTargetsUpdate(BaseModel):
    targets: list[CompletenessTargetItem]
