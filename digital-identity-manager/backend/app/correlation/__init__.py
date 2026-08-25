"""Explainable correlation engine."""

from app.correlation.engine import (
    CorrelationScore,
    compare,
    evaluate,
    rules_payload,
    run_correlation,
    score_components,
)
from app.correlation.rules import METHOD_DESCRIPTION, RULES, band

__all__ = [
    "CorrelationScore",
    "METHOD_DESCRIPTION",
    "RULES",
    "band",
    "compare",
    "evaluate",
    "rules_payload",
    "run_correlation",
    "score_components",
]
