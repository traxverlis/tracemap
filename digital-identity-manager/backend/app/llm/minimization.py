"""Data minimisation applied before *any* call to an external LLM.

Rules enforced here (see PRIVACY.md):

1. only the fields required by the task are selected;
2. personal data is reduced (masked emails, no phone numbers, no addresses);
3. useless data is dropped;
4. the whole layer can be disabled (``LLM_PROVIDER=disabled``);
5. only a hash of the context is journalised, never the raw context;
6. secrets, passwords and API tokens are never included.
"""

from __future__ import annotations

import hashlib
import json
import re
from typing import Any

from app.config import Settings
from app.services.normalization import mask_email, mask_phone

# Keys that must never leave the machine, whatever the task.
FORBIDDEN_KEYS = frozenset(
    {
        "password",
        "password_hash",
        "secret",
        "secret_key",
        "token",
        "access_token",
        "refresh_token",
        "api_key",
        "apikey",
        "authorization",
        "cookie",
        "session",
        "private_key",
        "hibp_api_key",
        "llm_api_key",
        "osint_runner_token",
    }
)

SENSITIVE_KEY_HINTS = ("address", "adresse", "birth", "naissance", "postal", "zip")

SECRET_PATTERN = re.compile(
    r"(?i)\b(?:bearer\s+[a-z0-9._~+/-]{12,}|sk-[a-z0-9]{16,}|ghp_[a-z0-9]{20,}|"
    r"xox[baprs]-[a-z0-9-]{10,}|eyJ[a-z0-9_-]{10,}\.[a-z0-9_-]{10,}\.[a-z0-9_-]{10,})\b"
)
EMAIL_PATTERN = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")
PHONE_PATTERN = re.compile(r"(?<!\w)\+?\d[\d ().-]{7,}\d(?!\w)")

REDACTED = "[REDACTED]"
MAX_STRING_LENGTH = 500
MAX_ITEMS = 50


class MinimizationPolicy:
    """Policy driven by the application settings."""

    def __init__(self, settings: Settings) -> None:
        self.allow_addresses = settings.llm_allow_addresses
        self.allow_phone_numbers = settings.llm_allow_phone_numbers
        self.allow_full_emails = settings.llm_allow_full_emails

    def as_dict(self) -> dict[str, bool]:
        return {
            "allow_addresses": self.allow_addresses,
            "allow_phone_numbers": self.allow_phone_numbers,
            "allow_full_emails": self.allow_full_emails,
        }


def _scrub_text(text: str, policy: MinimizationPolicy) -> str:
    scrubbed = SECRET_PATTERN.sub(REDACTED, text)
    if not policy.allow_full_emails:
        scrubbed = EMAIL_PATTERN.sub(lambda match: mask_email(match.group(0)), scrubbed)
    if not policy.allow_phone_numbers:
        scrubbed = PHONE_PATTERN.sub(lambda match: mask_phone(match.group(0)), scrubbed)
    if len(scrubbed) > MAX_STRING_LENGTH:
        scrubbed = scrubbed[:MAX_STRING_LENGTH] + "..."
    return scrubbed


def minimize(value: Any, policy: MinimizationPolicy, key: str | None = None) -> Any:
    """Recursively minimise a payload before sending it to an LLM."""
    lowered = (key or "").lower()
    if lowered in FORBIDDEN_KEYS:
        return REDACTED
    if not policy.allow_addresses and any(hint in lowered for hint in SENSITIVE_KEY_HINTS):
        return REDACTED

    if isinstance(value, dict):
        return {
            str(k): minimize(v, policy, str(k))
            for k, v in list(value.items())[:MAX_ITEMS]
            if v is not None
        }
    if isinstance(value, list | tuple | set):
        return [minimize(item, policy, key) for item in list(value)[:MAX_ITEMS]]
    if isinstance(value, str):
        if lowered == "email" and not policy.allow_full_emails:
            return mask_email(value)
        if lowered in {"phone", "phone_number"} and not policy.allow_phone_numbers:
            return mask_phone(value)
        return _scrub_text(value, policy)
    if isinstance(value, int | float | bool) or value is None:
        return value
    return _scrub_text(str(value), policy)


def context_hash(context: Any) -> str:
    """Stable hash of the minimised context, stored instead of the context."""
    serialised = json.dumps(context, sort_keys=True, default=str, ensure_ascii=False)
    return hashlib.sha256(serialised.encode("utf-8")).hexdigest()
