"""Controlled vocabularies shared by the ORM models, schemas and services."""

from __future__ import annotations

from enum import StrEnum


class IdentifierType(StrEnum):
    EMAIL = "email"
    PHONE = "phone"
    USERNAME = "username"
    NAME = "name"
    ADDRESS = "address"
    DOMAIN = "domain"


class EntityType(StrEnum):
    IDENTITY = "identity"
    EMAIL = "email"
    PHONE = "phone"
    USERNAME = "username"
    NAME = "name"
    ADDRESS = "address"
    COMPANY = "company"
    DOMAIN = "domain"
    PROFILE = "profile"
    ACCOUNT = "account"
    FINDING = "finding"
    DATA_BROKER = "data_broker"
    PHOTO = "photo"


class RelationshipType(StrEnum):
    OWNS = "OWNS"
    USED = "USED"
    LINKED_TO = "LINKED_TO"
    FOUND_ON = "FOUND_ON"
    MENTIONED_ON = "MENTIONED_ON"
    ASSOCIATED_WITH = "ASSOCIATED_WITH"
    POSSIBLY_SAME_PERSON = "POSSIBLY_SAME_PERSON"
    CONFIRMED_SAME_PERSON = "CONFIRMED_SAME_PERSON"
    NOT_SAME_PERSON = "NOT_SAME_PERSON"


class RelationshipStatus(StrEnum):
    UNKNOWN = "UNKNOWN"
    SUGGESTED = "SUGGESTED"
    CONFIRMED = "CONFIRMED"
    REJECTED = "REJECTED"


class ReviewStatus(StrEnum):
    """Human review state shared by findings, accounts and AI suggestions."""

    NEW = "NEW"
    SUGGESTED = "SUGGESTED"
    CONFIRMED = "CONFIRMED"
    REJECTED = "REJECTED"
    LATER = "LATER"
    REAPPEARED = "REAPPEARED"
    REMOVED = "REMOVED"


class ScanStatus(StrEnum):
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


class ScanType(StrEnum):
    USERNAME = "username"
    EMAIL = "email"
    DOMAIN = "domain"
    BREACH = "breach"
    DATA_BROKER = "data_broker"
    RECHECK = "recheck"


class DeletionStatus(StrEnum):
    TODO = "TODO"
    REQUESTED = "REQUESTED"
    IN_PROGRESS = "IN_PROGRESS"
    CONFIRMED = "CONFIRMED"
    REFUSED = "REFUSED"
    REAPPEARED = "REAPPEARED"


class FindingCategory(StrEnum):
    ACCOUNT = "account"
    DATA_BROKER = "data_broker"
    BREACH = "breach"
    MENTION = "mention"
    DOCUMENT = "document"
    DOMAIN = "domain"
    OTHER = "other"


class SuggestionStatus(StrEnum):
    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"
    LATER = "LATER"


class SuggestionType(StrEnum):
    CORRELATION = "correlation"
    MISSING_INFORMATION = "missing_information"
    SEARCH_IDEA = "search_idea"
    SUMMARY = "summary"
    CLASSIFICATION = "classification"
    SCORE_EXPLANATION = "score_explanation"
