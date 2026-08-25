"""OpenAI-compatible provider (optional).

Works with the OpenAI API and with any provider exposing the same
``/chat/completions`` contract (set ``LLM_API_BASE``).
"""

from __future__ import annotations

from typing import Any

import httpx

from app.llm.base import SYSTEM_PROMPT, LLMError, LLMProvider, Suggestion
from app.llm.prompts import build_prompt, parse_suggestions

DEFAULT_MODEL = "gpt-4o-mini"
DEFAULT_API_BASE = "https://api.openai.com/v1"


class OpenAIProvider(LLMProvider):
    name = "openai"

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
            raise LLMError("LLM_API_KEY is required for the OpenAI provider")
        self._api_key = api_key
        self._api_base = (api_base or DEFAULT_API_BASE).rstrip("/")
        self._max_output_tokens = max_output_tokens
        self._timeout = timeout

    def generate(self, task: str, context: dict[str, Any]) -> list[Suggestion]:
        payload = {
            "model": self.model,
            "max_tokens": self._max_output_tokens,
            "response_format": {"type": "json_object"},
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": build_prompt(task, context)},
            ],
        }
        try:
            response = httpx.post(
                f"{self._api_base}/chat/completions",
                json=payload,
                headers={
                    "Authorization": "Bearer " + self._api_key,
                    "content-type": "application/json",
                },
                timeout=self._timeout,
            )
            response.raise_for_status()
            data = response.json()
        except httpx.HTTPError as exc:  # pragma: no cover - network failure path
            raise LLMError(f"OpenAI request failed: {exc.__class__.__name__}") from exc

        choices = data.get("choices") or []
        text = ""
        if choices and isinstance(choices[0], dict):
            text = (choices[0].get("message") or {}).get("content") or ""
        return parse_suggestions(text, task)
