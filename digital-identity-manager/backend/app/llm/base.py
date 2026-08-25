"""LLM provider abstraction.

The application must run perfectly with **no** LLM at all: the default provider
is :class:`~app.llm.disabled.DisabledProvider`. Providers only ever return
*suggestions*, which are persisted as ``ai_suggestions`` rows and require a
human decision before anything is changed in the inventory.
"""

from __future__ import annotations

import abc
from dataclasses import dataclass, field
from typing import Any

SYSTEM_PROMPT = (
    "You assist a person auditing THEIR OWN digital identity. "
    "You never invent identities, accounts, URLs or opt-out addresses. "
    "You never turn a hypothesis into a fact: everything you return is a "
    "suggestion that a human will validate. "
    "You never request credentials and never suggest bypassing authentication, "
    "CAPTCHAs, anti-bot protections or access controls. "
    "If the provided context is insufficient, say so instead of guessing. "
    "Answer with strict JSON matching the requested schema."
)

CAPABILITIES = (
    "analyse_results",
    "propose_correlations",
    "identify_missing_information",
    "propose_searches",
    "summarise_findings",
    "classify_results",
    "explain_score",
)


class LLMError(RuntimeError):
    """Raised when a provider cannot fulfil a request."""


class LLMDisabledError(LLMError):
    """Raised when the AI assistant is called while disabled."""


@dataclass
class Suggestion:
    """A single suggestion returned by a provider, pending human validation."""

    type: str
    suggestion: str
    rationale: str | None = None
    confidence: int = 0
    source_entity: str | None = None
    target_entity: str | None = None
    payload: dict[str, Any] = field(default_factory=dict)


@dataclass
class LLMResult:
    provider: str
    model: str | None
    suggestions: list[Suggestion]
    context_hash: str


class LLMProvider(abc.ABC):
    """Interface implemented by every provider."""

    name: str = "base"

    def __init__(self, model: str | None = None) -> None:
        self.model = model

    @property
    def enabled(self) -> bool:
        return True

    @abc.abstractmethod
    def generate(self, task: str, context: dict[str, Any]) -> list[Suggestion]:
        """Return suggestions for ``task`` given an already minimised context."""

    def capabilities(self) -> list[str]:
        return list(CAPABILITIES)
