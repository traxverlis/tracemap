"""Task prompts and strict parsing of provider answers."""

from __future__ import annotations

import json
import re
from typing import Any

from app.llm.base import Suggestion

TASK_INSTRUCTIONS: dict[str, str] = {
    "correlations": (
        "Given the inventory below, propose which discovered accounts probably "
        "belong to the same person, and explain which observable signals support "
        "each hypothesis. Never claim certainty."
    ),
    "missing_information": (
        "List which parts of the identity inventory look incomplete and what the "
        "operator could add to make the audit more useful."
    ),
    "search_ideas": (
        "Propose additional lawful, terms-of-service compliant searches the "
        "operator could run on public sources about their own identity."
    ),
    "summary": (
        "Summarise the findings below: what is exposed, what should be reviewed "
        "first, and which deletion requests look most valuable."
    ),
}

SUGGESTION_TYPE_BY_TASK = {
    "correlations": "correlation",
    "missing_information": "missing_information",
    "search_ideas": "search_idea",
    "summary": "summary",
}

RESPONSE_SCHEMA = (
    'Respond with JSON only, shaped as {"suggestions": [{"suggestion": string, '
    '"rationale": string, "confidence": integer 0-100, "source_entity": string|null, '
    '"target_entity": string|null}]}.'
)

_JSON_BLOCK = re.compile(r"\{.*\}", re.DOTALL)


def build_prompt(task: str, context: dict[str, Any]) -> str:
    instruction = TASK_INSTRUCTIONS.get(task)
    if instruction is None:
        raise ValueError(f"unknown task: {task!r}")
    payload = json.dumps(context, ensure_ascii=False, indent=2, default=str)
    return f"{instruction}\n\n{RESPONSE_SCHEMA}\n\nMinimised context:\n{payload}"


def parse_suggestions(text: str, task: str) -> list[Suggestion]:
    """Parse a provider answer defensively; never raise on malformed JSON."""
    suggestion_type = SUGGESTION_TYPE_BY_TASK.get(task, "summary")
    match = _JSON_BLOCK.search(text or "")
    if not match:
        cleaned = (text or "").strip()
        if not cleaned:
            return []
        return [Suggestion(type=suggestion_type, suggestion=cleaned[:2000], confidence=0)]
    try:
        data = json.loads(match.group(0))
    except json.JSONDecodeError:
        return [Suggestion(type=suggestion_type, suggestion=text.strip()[:2000], confidence=0)]

    raw_items = data.get("suggestions") if isinstance(data, dict) else None
    if not isinstance(raw_items, list):
        return [Suggestion(type=suggestion_type, suggestion=json.dumps(data)[:2000])]

    suggestions: list[Suggestion] = []
    for item in raw_items[:25]:
        if not isinstance(item, dict):
            continue
        text_value = str(item.get("suggestion") or "").strip()
        if not text_value:
            continue
        try:
            confidence = int(item.get("confidence") or 0)
        except (TypeError, ValueError):
            confidence = 0
        suggestions.append(
            Suggestion(
                type=suggestion_type,
                suggestion=text_value[:2000],
                rationale=(
                    str(item.get("rationale")).strip()[:2000] if item.get("rationale") else None
                ),
                confidence=max(0, min(100, confidence)),
                source_entity=(
                    str(item["source_entity"])[:128] if item.get("source_entity") else None
                ),
                target_entity=(
                    str(item["target_entity"])[:128] if item.get("target_entity") else None
                ),
                payload={"task": task},
            )
        )
    return suggestions
