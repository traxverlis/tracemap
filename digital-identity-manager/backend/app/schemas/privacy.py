"""Data broker, deletion request, AI, dashboard and privacy schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field

from app.schemas.common import ORMModel
from app.schemas.identity import Completeness
from app.schemas.osint import ScanRead, ToolDescriptor


class DataBrokerBase(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    domain: str | None = Field(default=None, max_length=255)
    country: str | None = Field(default=None, max_length=64)
    category: str | None = Field(default=None, max_length=64)
    search_url: str | None = Field(default=None, max_length=512)
    optout_url: str | None = Field(default=None, max_length=512)
    optout_method: str | None = Field(default=None, max_length=64)
    requires_email: bool = False
    requires_phone: bool = False
    requires_identity_document: bool = False
    automation_possible: bool = False
    notes: str | None = None


class DataBrokerCreate(DataBrokerBase):
    pass


class DataBrokerUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    domain: str | None = None
    country: str | None = None
    category: str | None = None
    search_url: str | None = None
    optout_url: str | None = None
    optout_method: str | None = None
    requires_email: bool | None = None
    requires_phone: bool | None = None
    requires_identity_document: bool | None = None
    automation_possible: bool | None = None
    notes: str | None = None
    last_checked: datetime | None = None


class DataBrokerRead(DataBrokerBase, ORMModel):
    id: str
    last_checked: datetime | None
    created_at: datetime
    updated_at: datetime


class CatalogImportResponse(BaseModel):
    imported: int
    skipped: int


class DeletionRequestCreate(BaseModel):
    identity_id: str | None = None
    finding_id: str | None = None
    broker_id: str | None = None
    status: Literal["TODO", "REQUESTED", "IN_PROGRESS", "CONFIRMED", "REFUSED", "REAPPEARED"] = (
        "TODO"
    )
    method: str | None = Field(default=None, max_length=64)
    requested_at: datetime | None = None
    confirmation: str | None = None
    confirmation_url: str | None = Field(default=None, max_length=512)
    verified_at: datetime | None = None
    next_check: datetime | None = None
    notes: str | None = None


class DeletionRequestUpdate(BaseModel):
    status: (
        Literal["TODO", "REQUESTED", "IN_PROGRESS", "CONFIRMED", "REFUSED", "REAPPEARED"] | None
    ) = None
    method: str | None = None
    requested_at: datetime | None = None
    confirmation: str | None = None
    confirmation_url: str | None = None
    verified_at: datetime | None = None
    next_check: datetime | None = None
    notes: str | None = None


class DeletionRequestRead(ORMModel):
    id: str
    identity_id: str | None
    finding_id: str | None
    broker_id: str | None
    status: str
    method: str | None
    requested_at: datetime | None
    confirmation: str | None
    confirmation_url: str | None
    verified_at: datetime | None
    next_check: datetime | None
    notes: str | None
    created_at: datetime
    updated_at: datetime


class MinimizationPolicy(BaseModel):
    allow_addresses: bool
    allow_phone_numbers: bool
    allow_full_emails: bool


class AIStatus(BaseModel):
    enabled: bool
    provider: str
    model: str | None = None
    minimization: MinimizationPolicy
    capabilities: list[str] = Field(default_factory=list)


class AISuggestRequest(BaseModel):
    identity_id: str
    task: Literal["correlations", "missing_information", "search_ideas", "summary"]


class AISuggestionRead(ORMModel):
    id: str
    type: str
    source_entity: str | None
    target_entity: str | None
    provider: str | None
    model: str | None
    suggestion: str
    rationale: str | None
    confidence: int
    status: str
    created_at: datetime | None
    validated_at: datetime | None
    payload_json: dict[str, Any]


class AISuggestionDecision(BaseModel):
    decision: Literal["ACCEPT", "REJECT", "LATER"]
    reason: str | None = None


class DashboardSummary(BaseModel):
    identifiers: int
    emails: int
    phones: int
    usernames: int
    addresses: int
    profiles: int
    accounts_found: int
    relationships_confirmed: int
    relationships_to_review: int
    data_brokers: int
    deletions_todo: int
    deletions_requested: int
    deletions_confirmed: int
    data_reappeared: int
    breaches: int
    last_scan: ScanRead | None = None
    next_scans: list[ScanRead] = Field(default_factory=list)
    completeness: Completeness


class CorrelationSettings(BaseModel):
    max_auto_score: int
    suggest_threshold: int


class StorageSettings(BaseModel):
    evidence_dir: str
    reports_dir: str


class SettingsResponse(BaseModel):
    environment: str
    ai: AIStatus
    tools: list[ToolDescriptor]
    correlation: CorrelationSettings
    storage: StorageSettings


class EraseRequest(BaseModel):
    identity_id: str | None = None
    confirm: str = Field(description="Must be the literal string 'ERASE'")


class EraseResponse(BaseModel):
    deleted: dict[str, int]
