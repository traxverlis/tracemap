"""Correlation engine: explainability, noisy-OR scoring and the 95 cap."""

from __future__ import annotations

from app.correlation import rules
from app.correlation.engine import Component, evaluate, score_components
from app.correlation.features import EntityFeatures


def _features(entity_id: str, **kwargs) -> EntityFeatures:
    features = EntityFeatures(entity_type="account", entity_id=entity_id, label=entity_id)
    for key, value in kwargs.items():
        getattr(features, key).update(value)
    return features


def test_identical_email_is_a_very_strong_signal():
    left = _features("a", emails={"me@example.com"})
    right = _features("b", emails={"me@example.com"})
    score = evaluate(left, right)
    assert score.score >= 90
    assert any(component.rule == "same_email" for component in score.components)
    assert "email" in score.reason().lower()


def test_statement_example_scores_95():
    """same username (+70) + same email (+100) + same personal site (+60) => 95."""
    left = _features(
        "a",
        usernames={"johndoe"},
        emails={"john@example.com"},
        domains={"john.example"},
    )
    right = _features(
        "b",
        usernames={"johndoe"},
        emails={"john@example.com"},
        domains={"john.example"},
    )
    score = evaluate(left, right)
    assert score.score == 95, score.as_dict()
    assert score.band.startswith("very strong")


def test_score_never_reaches_certainty_automatically():
    components = [
        Component(rule="same_email", label="Same email", weight=100, detail="x"),
        Component(rule="same_phone", label="Same phone", weight=100, detail="y"),
    ]
    assert score_components(components).score <= 95


def test_penalties_lower_the_score():
    positive = [Component(rule="same_username", label="u", weight=70, detail="e")]
    penalised = positive + [Component(rule="conflicting_email", label="c", weight=-40, detail="e")]
    assert score_components(penalised).score < score_components(positive).score


def test_weak_signals_alone_stay_below_the_suggestion_threshold():
    left = _features("a", bio_tokens={"python", "osint", "docker"})
    right = _features("b", bio_tokens={"python", "osint", "docker"})
    assert evaluate(left, right).score < 40


def test_explanation_lists_every_component():
    left = _features("a", usernames={"johndoe"}, names={"john doe"})
    right = _features("b", usernames={"johndoe"}, names={"john doe"})
    explanation = evaluate(left, right).as_dict()
    assert explanation["method"] == rules.METHOD_DESCRIPTION
    labels = {component["rule"] for component in explanation["components"]}
    assert "same_username" in labels
    assert "same_name" in labels
    assert explanation["score"] == evaluate(left, right).score


def test_no_common_signal_yields_zero():
    left = _features("a", usernames={"alpha"})
    right = _features("b", usernames={"beta"})
    assert evaluate(left, right).score == 0
