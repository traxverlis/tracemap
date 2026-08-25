"""Correlation rules and their documented weights.

Every rule is a *signal*: it says how much the observation raises (or lowers)
the probability that two entities belong to the same person. Weights are
deliberately expressed on a 0-100 scale so they can be read and tuned by a
human, and every applied rule is stored with the resulting relationship.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Rule:
    key: str
    label: str
    weight: int
    description: str


RULES: tuple[Rule, ...] = (
    Rule(
        key="same_email",
        label="Same email address",
        weight=100,
        description="The two entities expose the very same normalised email address.",
    ),
    Rule(
        key="same_phone",
        label="Same phone number",
        weight=100,
        description="The two entities expose the same phone number in E.164 form.",
    ),
    Rule(
        key="explicit_link",
        label="Explicit link between the two accounts",
        weight=90,
        description="One profile explicitly links to the other (declared cross-link).",
    ),
    Rule(
        key="same_username",
        label="Same exact username",
        weight=70,
        description="Identical normalised username on two different platforms.",
    ),
    Rule(
        key="same_domain",
        label="Same personal domain",
        weight=60,
        description="Both entities reference the same personal domain or website.",
    ),
    Rule(
        key="same_avatar",
        label="Identical avatar",
        weight=50,
        description="Identical image hash (SHA-256) or very close perceptual hash.",
    ),
    Rule(
        key="same_name",
        label="Identical display name",
        weight=40,
        description="Normalised display names are identical.",
    ),
    Rule(
        key="similar_bio",
        label="Similar biography",
        weight=20,
        description="Biographies share a significant amount of rare tokens.",
    ),
    Rule(
        key="similar_username",
        label="Similar username",
        weight=25,
        description="Usernames differ only by a short suffix, digits or separators.",
    ),
    Rule(
        key="same_company",
        label="Same employer",
        weight=25,
        description="Both entities mention the same company or professional domain.",
    ),
    Rule(
        key="same_city",
        label="Same declared city",
        weight=15,
        description="Both entities declare a city the operator has lived in.",
    ),
    # --- Negative signals (penalties) -------------------------------------
    Rule(
        key="conflicting_country",
        label="Conflicting country",
        weight=-25,
        description="The declared countries are mutually exclusive.",
    ),
    Rule(
        key="conflicting_timeline",
        label="Conflicting activity period",
        weight=-20,
        description="Activity periods cannot overlap for a single person.",
    ),
)

RULES_BY_KEY: dict[str, Rule] = {rule.key: rule for rule in RULES}

METHOD_DESCRIPTION = (
    "Positive signals are combined with a noisy-OR ("
    "score = 1 - product(1 - weight/100)), which keeps the strongest signal "
    "dominant while letting weak independent signals reinforce each other. "
    "Penalties are then subtracted linearly. An automatically computed score is "
    "capped (default 95) because the engine never declares certainty on its own: "
    "only a human decision can move a relationship to CONFIRMED."
)


def band(score: int) -> str:
    """Human readable confidence band for a score."""
    if score >= 90:
        return "very strong match"
    if score >= 70:
        return "strong match"
    if score >= 40:
        return "possible match"
    if score > 0:
        return "weak signal"
    return "no signal"
