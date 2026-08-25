"""Anthropic Claude provider (optional)."""

from __future__ import annotations

from typing import Any

import httpx

from app.llm.base import SYSTEM_PROMPT, LLMError, LLMProvider, Suggestion
from app.llm.prompts import build_prompt, parse_suggestions

DEFAULT_MODEL = "claude-3-5-sonnet-latest"
DEFAULT_API_BASE = "https://api.anthropic.com/v1"
ANTHROPIC_VERSION = "2023-06-01"


class ClaudeProvider(LLMProvider):
    name = "claude"

    def __init__(
        self,
        api_key: str,
        model: str | None = None,
        api_base: str | None = None,
        max_output_tokens: int = 1024,
        timeout: int = 60,
    ) -> None:
        super().__init__(model or DEFAULT_MODEL)
        if not api_key:
            raise LLMError("LLM_API_KEY is required for the Claude provider")
        self._api_key = api_key
        self._api_base = (api_base or DEFAULT_API_BASE).rstrip("/")
        self._max_output_tokens = max_output_tokens
        self._timeout = timeout

    def generate(self, task: str, context: dict[str, Any]) -> list[Suggestion]:
        payload = {
            "model": self.model,
            "max_tokens": self._max_output_tokens,
            "system": SYSTEM_PROMPT,
            "messages": [{"role": "user", "content": build_prompt(task, context)}],
        }
        try:
            response = httpx.post(
                f"{self._api_base}/messages",
                json=payload,
                headers={
                    "x-api-key": self._api_key,
                    "anthropic-version": ANTHROPIC_VERSION,
                    "content-type": "application/json",
                },
                timeout=self._timeout,
            )
            response.raise_for_status()
            data = response.json()
        except httpx.HTTPError as exc:  # pragma: no cover - network failure path
            raise LLMError(f"Claude request failed: {exc.__class__.__name__}") from exc

        blocks = data.get("content") or []
        text = "".join(block.get("text", "") for block in blocks if isinstance(block, dict))
        return parse_suggestions(text, task)
