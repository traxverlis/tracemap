"""Provider factory and the minimisation-aware assistant facade."""

from __future__ import annotations

import logging
from typing import Any

from app.config import Settings, get_settings
from app.llm.base import CAPABILITIES, LLMDisabledError, LLMProvider, LLMResult
from app.llm.claude import ClaudeProvider
from app.llm.disabled import DisabledProvider
from app.llm.minimization import MinimizationPolicy, context_hash, minimize
from app.llm.openai import OpenAIProvider

logger = logging.getLogger(__name__)


def build_provider(settings: Settings | None = None) -> LLMProvider:
    settings = settings or get_settings()
    provider = settings.llm_provider
    if provider == "claude":
        return ClaudeProvider(
            api_key=settings.llm_api_key or "",
            model=settings.llm_model,
            api_base=settings.llm_api_base,
            max_output_tokens=settings.llm_max_output_tokens,
            timeout=settings.llm_timeout_seconds,
        )
    if provider == "openai":
        return OpenAIProvider(
            api_key=settings.llm_api_key or "",
            model=settings.llm_model,
            api_base=settings.llm_api_base,
            max_output_tokens=settings.llm_max_output_tokens,
            timeout=settings.llm_timeout_seconds,
        )
    return DisabledProvider()


class IdentityAssistant:
    """Minimises the context, calls the provider, returns suggestions.

    The assistant is intentionally read-only: it never writes to the inventory.
    Callers persist the returned suggestions as ``ai_suggestions`` rows.
    """

    def __init__(
        self, provider: LLMProvider | None = None, settings: Settings | None = None
    ) -> None:
        self.settings = settings or get_settings()
        self.provider = provider or build_provider(self.settings)
        self.policy = MinimizationPolicy(self.settings)

    @property
    def enabled(self) -> bool:
        return self.provider.enabled

    def status(self) -> dict[str, Any]:
        return {
            "enabled": self.enabled,
            "provider": self.provider.name,
            "model": self.provider.model if self.enabled else None,
            "minimization": self.policy.as_dict(),
            "capabilities": self.provider.capabilities() if self.enabled else list(CAPABILITIES),
        }

    def run(self, task: str, context: dict[str, Any]) -> LLMResult:
        if not self.enabled:
            raise LLMDisabledError(
                "The AI assistant is disabled; every other feature works without it."
            )
        minimized = minimize(context, self.policy)
        digest = context_hash(minimized)
        # Only the hash is logged: the context itself never reaches the logs.
        logger.info(
            "llm.request",
            extra={"task": task, "provider": self.provider.name, "context_hash": digest},
        )
        suggestions = self.provider.generate(task, minimized)
        return LLMResult(
            provider=self.provider.name,
            model=self.provider.model,
            suggestions=suggestions,
            context_hash=digest,
        )
