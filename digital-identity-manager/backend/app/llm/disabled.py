"""The default provider: no AI at all."""

from __future__ import annotations

from typing import Any

from app.llm.base import LLMDisabledError, LLMProvider, Suggestion


class DisabledProvider(LLMProvider):
    """No external call is ever performed.

    Every deterministic feature of the application (normalisation, correlation,
    completeness, scans, deletion tracking) works without this provider.
    """

    name = "disabled"

    @property
    def enabled(self) -> bool:
        return False

    def generate(self, task: str, context: dict[str, Any]) -> list[Suggestion]:
        raise LLMDisabledError(
            "The AI assistant is disabled. Set LLM_PROVIDER to 'claude' or 'openai' "
            "and provide LLM_API_KEY to enable optional suggestions."
        )

    def capabilities(self) -> list[str]:
        return []
