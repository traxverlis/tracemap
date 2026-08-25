"""Identity completeness score.

The score measures **how complete the research inventory is**, never how much
personal data is exposed. Each category compares what the operator has already
inventoried with what they declared they expect to find, so the result is fully
explainable and the missing categories are listed explicitly.
"""

from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import (
    Company,
    CompletenessTarget,
    Domain,
    Identifier,
    Identity,
    Photo,
    Profile,
)


@dataclass(frozen=True)
class CategorySpec:
    key: str
    label: str
    weight: float
    default_expected: int


CATEGORIES: tuple[CategorySpec, ...] = (
    CategorySpec("general", "General information", 1.0, 1),
    CategorySpec("email", "Known emails", 2.0, 2),
    CategorySpec("phone", "Known phone numbers", 1.5, 1),
    CategorySpec("username", "Known usernames", 2.0, 3),
    CategorySpec("name", "Name variants / former identities", 1.0, 1),
    CategorySpec("address", "Former addresses", 1.0, 1),
    CategorySpec("professional", "Professional history", 1.0, 1),
    CategorySpec("domain", "Domains / personal sites", 1.0, 1),
    CategorySpec("profile", "Known profiles", 1.5, 3),
    CategorySpec("photo", "Photos / avatars", 0.5, 1),
)

CATEGORY_BY_KEY = {category.key: category for category in CATEGORIES}
IDENTIFIER_CATEGORIES = {"email", "phone", "username", "name", "address", "domain"}


def _identifier_counts(db: Session, identity_id: str) -> dict[str, int]:
    rows = db.execute(
        select(Identifier.type, func.count(Identifier.id))
        .where(Identifier.identity_id == identity_id)
        .group_by(Identifier.type)
    ).all()
    return {str(row[0]): int(row[1]) for row in rows}


def _general_known(identity: Identity) -> int:
    attributes = identity.attributes or {}
    filled = any(
        [
            identity.first_name,
            identity.last_name,
            identity.birth_date,
            identity.country,
            attributes.get("name_variants"),
            attributes.get("cities"),
        ]
    )
    return 1 if filled else 0


def known_counts(db: Session, identity: Identity) -> dict[str, int]:
    counts = _identifier_counts(db, identity.id)
    domain_rows = (
        db.scalar(select(func.count(Domain.id)).where(Domain.identity_id == identity.id)) or 0
    )
    return {
        "general": _general_known(identity),
        "email": counts.get("email", 0),
        "phone": counts.get("phone", 0),
        "username": counts.get("username", 0),
        "name": counts.get("name", 0),
        "address": counts.get("address", 0),
        "professional": db.scalar(
            select(func.count(Company.id)).where(Company.identity_id == identity.id)
        )
        or 0,
        "domain": counts.get("domain", 0) + int(domain_rows),
        "profile": db.scalar(
            select(func.count(Profile.id)).where(Profile.identity_id == identity.id)
        )
        or 0,
        "photo": db.scalar(select(func.count(Photo.id)).where(Photo.identity_id == identity.id))
        or 0,
    }


def expected_counts(db: Session, identity_id: str) -> dict[str, int]:
    targets = {
        row.category: row.expected_count
        for row in db.scalars(
            select(CompletenessTarget).where(CompletenessTarget.identity_id == identity_id)
        )
    }
    return {
        category.key: max(int(targets.get(category.key, category.default_expected)), 0)
        for category in CATEGORIES
    }


def compute(db: Session, identity: Identity) -> dict:
    """Return the score and the per-category explanation."""
    known = known_counts(db, identity)
    expected = expected_counts(db, identity.id)

    categories = []
    weighted_sum = 0.0
    total_weight = 0.0
    missing_labels: list[str] = []

    for spec in CATEGORIES:
        expected_count = expected.get(spec.key, spec.default_expected)
        known_count = known.get(spec.key, 0)
        if expected_count <= 0:
            # The operator declared this category as not applicable.
            ratio = 1.0 if known_count == 0 else 1.0
            missing = 0
        else:
            ratio = min(known_count / expected_count, 1.0)
            missing = max(expected_count - known_count, 0)
        if missing > 0:
            missing_labels.append(f"{spec.label} ({known_count}/{expected_count})")
        weighted_sum += ratio * spec.weight
        total_weight += spec.weight
        categories.append(
            {
                "category": spec.key,
                "label": spec.label,
                "known": known_count,
                "expected": expected_count,
                "ratio": round(ratio, 3),
                "weight": spec.weight,
                "missing": missing,
            }
        )

    score = int(round((weighted_sum / total_weight) * 100)) if total_weight else 0
    if missing_labels:
        explanation = (
            "Inventory coverage of your own research material. Still incomplete: "
            + "; ".join(missing_labels)
            + ". This score does not measure how exposed you are."
        )
    else:
        explanation = (
            "Every declared research category is complete. This score measures "
            "inventory coverage only, not exposure."
        )

    return {"score": score, "explanation": explanation, "categories": categories}
