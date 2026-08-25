"""Explainable correlation engine.

The engine never marks a correlation as certain: it produces ``SUGGESTED``
relationships carrying a documented, human-readable breakdown of every signal
that contributed to the score. A human then confirms or rejects it.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime
from difflib import SequenceMatcher
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.correlation.features import EntityFeatures, features_from_account, features_from_identity
from app.correlation.rules import METHOD_DESCRIPTION, RULES, RULES_BY_KEY, band
from app.models import (
    Account,
    Company,
    Domain,
    Identifier,
    Identity,
    Photo,
    Profile,
    Relationship,
)

SIMILAR_USERNAME_RATIO = 0.85
BIO_MIN_SHARED_TOKENS = 3
BIO_MIN_JACCARD = 0.25
PHASH_MAX_DISTANCE = 6


@dataclass
class Component:
    rule: str
    label: str
    weight: int
    detail: str | None = None

    def as_dict(self) -> dict[str, Any]:
        return {
            "rule": self.rule,
            "label": self.label,
            "weight": self.weight,
            "detail": self.detail,
        }


@dataclass
class CorrelationScore:
    score: int
    components: list[Component] = field(default_factory=list)
    method: str = METHOD_DESCRIPTION

    @property
    def band(self) -> str:
        return band(self.score)

    def reason(self) -> str:
        if not self.components:
            return "No matching signal."
        parts = [f"{component.label} ({component.weight:+d})" for component in self.components]
        return f"{self.band.capitalize()}: " + ", ".join(parts)

    def as_dict(self) -> dict[str, Any]:
        return {
            "score": self.score,
            "band": self.band,
            "method": self.method,
            "components": [component.as_dict() for component in self.components],
        }


def _hamming(left: str, right: str) -> int:
    if len(left) != len(right):
        return max(len(left), len(right))
    try:
        return bin(int(left, 16) ^ int(right, 16)).count("1")
    except ValueError:
        return sum(1 for a, b in zip(left, right, strict=False) if a != b)


def _similar_username(left: set[str], right: set[str]) -> tuple[str, str] | None:
    for a in left:
        for b in right:
            if a == b:
                continue
            if SequenceMatcher(None, a, b).ratio() >= SIMILAR_USERNAME_RATIO:
                return a, b
    return None


def _bio_overlap(left: set[str], right: set[str]) -> set[str]:
    shared = left & right
    if len(shared) < BIO_MIN_SHARED_TOKENS:
        return set()
    union = left | right
    if not union or len(shared) / len(union) < BIO_MIN_JACCARD:
        return set()
    return shared


def _avatar_match(left: EntityFeatures, right: EntityFeatures) -> str | None:
    shared = left.image_hashes & right.image_hashes
    if shared:
        return f"identical SHA-256 ({next(iter(shared))[:12]}...)"
    for a in left.perceptual_hashes:
        for b in right.perceptual_hashes:
            distance = _hamming(a, b)
            if distance <= PHASH_MAX_DISTANCE:
                return f"perceptual hash distance {distance}"
    return None


def compare(left: EntityFeatures, right: EntityFeatures) -> list[Component]:
    """Collect every signal shared by two entities (pure function)."""
    components: list[Component] = []

    def add(key: str, detail: str | None = None) -> None:
        rule = RULES_BY_KEY[key]
        components.append(Component(rule.key, rule.label, rule.weight, detail))

    shared_emails = left.emails & right.emails
    if shared_emails:
        add("same_email", f"shared address: {sorted(shared_emails)[0]}")

    shared_phones = left.phones & right.phones
    if shared_phones:
        add("same_phone", "shared phone number (masked in reports)")

    shared_usernames = left.usernames & right.usernames
    if shared_usernames:
        add("same_username", f"shared username: {sorted(shared_usernames)[0]}")
    else:
        similar = _similar_username(left.usernames, right.usernames)
        if similar:
            add("similar_username", f"{similar[0]} ~ {similar[1]}")

    if left.linked_urls & right.urls or right.linked_urls & left.urls:
        add("explicit_link", "one profile explicitly links to the other")

    shared_domains = left.domains & right.domains
    if shared_domains:
        add("same_domain", f"shared domain: {sorted(shared_domains)[0]}")

    avatar_detail = _avatar_match(left, right)
    if avatar_detail:
        add("same_avatar", avatar_detail)

    shared_names = left.names & right.names
    if shared_names:
        add("same_name", f"shared name: {sorted(shared_names)[0]}")

    shared_companies = left.companies & right.companies
    if shared_companies:
        add("same_company", f"shared employer: {sorted(shared_companies)[0]}")

    shared_cities = left.cities & right.cities
    if shared_cities:
        add("same_city", f"shared city: {sorted(shared_cities)[0]}")

    shared_bio = _bio_overlap(left.bio_tokens, right.bio_tokens)
    if shared_bio:
        add("similar_bio", "shared terms: " + ", ".join(sorted(shared_bio)[:5]))

    if left.countries and right.countries and not (left.countries & right.countries):
        add(
            "conflicting_country",
            f"{sorted(left.countries)} vs {sorted(right.countries)}",
        )

    return components


def score_components(
    components: list[Component], max_auto_score: int | None = None
) -> CorrelationScore:
    """Combine signals with a noisy-OR, subtract penalties, cap the result."""
    settings = get_settings()
    cap = settings.correlation_auto_max_score if max_auto_score is None else max_auto_score

    complement = 1.0
    penalty = 0
    for component in components:
        if component.weight >= 0:
            complement *= 1 - min(component.weight, 100) / 100
        else:
            penalty += -component.weight

    positive = (1 - complement) * 100
    raw = positive - penalty
    score = int(round(max(0.0, min(float(cap), raw))))
    return CorrelationScore(score=score, components=components)


def evaluate(left: EntityFeatures, right: EntityFeatures) -> CorrelationScore:
    return score_components(compare(left, right))


def _load_identity_features(db: Session, identity: Identity) -> EntityFeatures:
    identifiers = list(db.scalars(select(Identifier).where(Identifier.identity_id == identity.id)))
    profiles = list(db.scalars(select(Profile).where(Profile.identity_id == identity.id)))
    domains = list(db.scalars(select(Domain).where(Domain.identity_id == identity.id)))
    companies = list(db.scalars(select(Company).where(Company.identity_id == identity.id)))
    photos = list(db.scalars(select(Photo).where(Photo.identity_id == identity.id)))
    return features_from_identity(identity, identifiers, profiles, domains, companies, photos)


def _upsert_relationship(
    db: Session,
    *,
    identity_id: str,
    source_type: str,
    source_id: str,
    target_type: str,
    target_id: str,
    relationship_type: str,
    score: CorrelationScore,
) -> tuple[Relationship, bool]:
    existing = db.scalar(
        select(Relationship).where(
            Relationship.source_entity_type == source_type,
            Relationship.source_entity_id == source_id,
            Relationship.target_entity_type == target_type,
            Relationship.target_entity_id == target_id,
            Relationship.relationship_type == relationship_type,
        )
    )
    now = datetime.now(UTC)
    if existing is None:
        relationship = Relationship(
            identity_id=identity_id,
            source_entity_type=source_type,
            source_entity_id=source_id,
            target_entity_type=target_type,
            target_entity_id=target_id,
            relationship_type=relationship_type,
            confidence=score.score,
            source="correlation-engine",
            status="SUGGESTED",
            reason=score.reason(),
            explanation_json=score.as_dict(),
        )
        db.add(relationship)
        return relationship, True

    # A human decision is never overwritten by the engine.
    if existing.status in {"CONFIRMED", "REJECTED"}:
        existing.explanation_json = score.as_dict()
        existing.updated_at = now
        return existing, False

    existing.confidence = score.score
    existing.reason = score.reason()
    existing.explanation_json = score.as_dict()
    existing.status = "SUGGESTED"
    existing.updated_at = now
    return existing, False


def run_correlation(db: Session, identity: Identity) -> tuple[list[Relationship], int, int]:
    """Correlate discovered accounts with the declared identity inventory.

    Returns ``(relationships, created, updated)``.
    """
    settings = get_settings()
    identity_features = _load_identity_features(db, identity)
    accounts = list(db.scalars(select(Account).where(Account.identity_id == identity.id)))
    account_features = [features_from_account(account) for account in accounts]

    touched: list[Relationship] = []
    created = 0
    updated = 0

    for account, features in zip(accounts, account_features, strict=False):
        score = evaluate(identity_features, features)
        if score.score < settings.correlation_suggest_threshold:
            continue
        relationship, is_new = _upsert_relationship(
            db,
            identity_id=identity.id,
            source_type="identity",
            source_id=identity.id,
            target_type="account",
            target_id=account.id,
            relationship_type="POSSIBLY_SAME_PERSON",
            score=score,
        )
        touched.append(relationship)
        created += int(is_new)
        updated += int(not is_new)
        if account.status == "NEW":
            account.confidence = score.score

    # Account <-> account correlations (two profiles likely held by one person).
    for index, (account, features) in enumerate(zip(accounts, account_features, strict=False)):
        for other, other_features in zip(
            accounts[index + 1 :], account_features[index + 1 :], strict=False
        ):
            score = evaluate(features, other_features)
            if score.score < settings.correlation_suggest_threshold:
                continue
            relationship, is_new = _upsert_relationship(
                db,
                identity_id=identity.id,
                source_type="account",
                source_id=account.id,
                target_type="account",
                target_id=other.id,
                relationship_type="POSSIBLY_SAME_PERSON",
                score=score,
            )
            touched.append(relationship)
            created += int(is_new)
            updated += int(not is_new)

    db.flush()
    return touched, created, updated


def rules_payload() -> dict[str, Any]:
    settings = get_settings()
    return {
        "method": METHOD_DESCRIPTION,
        "max_auto_score": settings.correlation_auto_max_score,
        "rules": [
            {
                "key": rule.key,
                "label": rule.label,
                "weight": rule.weight,
                "description": rule.description,
            }
            for rule in RULES
        ],
    }
