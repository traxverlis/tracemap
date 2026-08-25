"""OSINT schemas: accounts, findings, evidence, scans, relationships, graph."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field

from app.schemas.common import ORMModel


class AccountRead(ORMModel):
    id: str
    identity_id: str
    platform: str
    username: str | None
    email: str | None
    url: str | None
    status: str
    confidence: int
    source: str | None
    first_seen: datetime | None
    last_seen: datetime | None
    attributes: dict[str, Any]
    created_at: datetime
    updated_at: datetime


class AccountUpdate(BaseModel):
    status: Literal["NEW", "SUGGESTED", "CONFIRMED", "REJECTED", "LATER"] | None = None
    confidence: int | None = Field(default=None, ge=0, le=100)
    notes: str | None = None


class FindingBase(BaseModel):
    source: str = Field(min_length=1, max_length=120)
    category: Literal[
        "account", "data_broker", "breach", "mention", "document", "domain", "other"
    ] = "other"
    title: str = Field(min_length=1, max_length=300)
    value: str | None = None
    url: str | None = Field(default=None, max_length=512)
    confidence: int = Field(default=0, ge=0, le=100)
    status: str = "NEW"
    broker_id: str | None = None
    account_id: str | None = None
    scan_id: str | None = None
    discovered_at: datetime | None = None
    last_verified_at: datetime | None = None
    attributes: dict[str, Any] = Field(default_factory=dict)


class FindingCreate(FindingBase):
    identity_id: str


class FindingUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=300)
    value: str | None = None
    url: str | None = None
    confidence: int | None = Field(default=None, ge=0, le=100)
    status: str | None = None
    category: str | None = None
    broker_id: str | None = None
    last_verified_at: datetime | None = None
    attributes: dict[str, Any] | None = None


class FindingRead(FindingBase, ORMModel):
    id: str
    identity_id: str
    created_at: datetime
    updated_at: datetime


class EvidenceCreate(BaseModel):
    source_url: str | None = Field(default=None, max_length=512)
    captured_at: datetime | None = None
    content_hash: str | None = Field(default=None, max_length=64)
    screenshot_path: str | None = Field(default=None, max_length=512)
    html_path: str | None = Field(default=None, max_length=512)
    metadata_json: dict[str, Any] = Field(default_factory=dict)


class EvidenceRead(ORMModel):
    id: str
    finding_id: str
    source_url: str | None
    captured_at: datetime | None
    content_hash: str | None
    screenshot_path: str | None
    html_path: str | None
    metadata_json: dict[str, Any]
    created_at: datetime


class RelationshipCreate(BaseModel):
    identity_id: str | None = None
    source_entity_type: str
    source_entity_id: str
    target_entity_type: str
    target_entity_id: str
    relationship_type: str
    confidence: int = Field(default=0, ge=0, le=100)
    source: str | None = None
    status: Literal["UNKNOWN", "SUGGESTED", "CONFIRMED", "REJECTED"] = "UNKNOWN"
    reason: str | None = None
    explanation_json: dict[str, Any] = Field(default_factory=dict)


class RelationshipRead(ORMModel):
    id: str
    identity_id: str | None
    source_entity_type: str
    source_entity_id: str
    target_entity_type: str
    target_entity_id: str
    relationship_type: str
    confidence: int
    source: str | None
    status: str
    reason: str | None
    explanation_json: dict[str, Any]
    decided_by: str | None
    decided_at: datetime | None
    created_at: datetime
    updated_at: datetime


class RelationshipDecision(BaseModel):
    decision: Literal["CONFIRM", "REJECT", "LATER"]
    reason: str | None = None


class ReviewItem(BaseModel):
    relationship: RelationshipRead
    question: str
    source_label: str
    target_label: str
    platform: str | None = None
    username: str | None = None
    url: str | None = None
    context: dict[str, Any] = Field(default_factory=dict)


class CorrelationRunRequest(BaseModel):
    identity_id: str


class CorrelationRunResponse(BaseModel):
    created: int
    updated: int
    relationships: list[RelationshipRead]


class CorrelationRule(BaseModel):
    key: str
    label: str
    weight: int
    description: str


class CorrelationRules(BaseModel):
    method: str
    max_auto_score: int
    rules: list[CorrelationRule]


class ScanCreate(BaseModel):
    identity_id: str
    tool: str = Field(min_length=1, max_length=64)
    scan_type: str = Field(min_length=1, max_length=64)
    target: str = Field(min_length=1, max_length=512)
    parameters_json: dict[str, Any] = Field(default_factory=dict)


class ScanRead(ORMModel):
    id: str
    identity_id: str | None
    scan_type: str
    target: str
    tool: str
    status: str
    started_at: datetime | None
    finished_at: datetime | None
    scheduled_for: datetime | None
    error: str | None
    parameters_json: dict[str, Any]
    created_at: datetime
    result_count: int = 0


class ScanResultRead(ORMModel):
    id: str
    scan_id: str
    result_type: str
    value: str | None
    url: str | None
    confidence: int
    raw_result_json: dict[str, Any]
    created_at: datetime | None


class PromoteRequest(BaseModel):
    result_ids: list[str] = Field(default_factory=list)


class PromoteResponse(BaseModel):
    accounts_created: int
    findings_created: int


class ToolDescriptor(BaseModel):
    tool: str
    scan_types: list[str]
    enabled: bool
    description: str
    requires: list[str] = Field(default_factory=list)


class GraphNode(BaseModel):
    id: str
    type: str
    label: str
    sublabel: str | None = None


class GraphEdge(BaseModel):
    id: str
    source: str
    target: str
    type: str
    status: str
    confidence: int
    reason: str | None = None


class GraphResponse(BaseModel):
    nodes: list[GraphNode]
    edges: list[GraphEdge]


class TimelineEvent(BaseModel):
    id: str
    timestamp: datetime
    action: str
    entity_type: str | None
    entity_id: str | None
    title: str
    metadata: dict[str, Any] = Field(default_factory=dict)
