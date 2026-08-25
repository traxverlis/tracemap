"""Data minimisation applied before any LLM call."""

from __future__ import annotations

from app.config import Settings
from app.llm.minimization import REDACTED, MinimizationPolicy, context_hash, minimize

SECRET = "test-secret-key-with-enough-entropy-1234567890"


def _policy(**overrides) -> MinimizationPolicy:
    settings = Settings(secret_key=SECRET, **overrides)
    return MinimizationPolicy(settings)


def test_secrets_are_never_forwarded():
    payload = {
        "api_key": "sk-should-not-leak",
        "password": "hunter2",
        "token": "ghp-example-value",
        "authorization": "bearer-value",
        "safe": "keep me",
    }
    minimized = minimize(payload, _policy())
    for key in ("api_key", "password", "token", "authorization"):
        assert minimized[key] == REDACTED
    assert minimized["safe"] == "keep me"


def test_addresses_are_redacted_by_default():
    minimized = minimize({"address": "1 rue de la Paix, Paris", "city": "Paris"}, _policy())
    assert minimized["address"] == REDACTED
    assert minimized["city"] == "Paris"


def test_addresses_can_be_opted_in():
    minimized = minimize({"address": "1 rue de la Paix"}, _policy(llm_allow_addresses=True))
    assert minimized["address"] == "1 rue de la Paix"


def test_emails_and_phones_are_masked():
    payload = {"email": "john.doe@example.com", "phone": "+33612345678"}
    minimized = minimize(payload, _policy())
    assert "john.doe" not in minimized["email"]
    assert minimized["email"].endswith("@example.com")
    assert "612345" not in minimized["phone"]


def test_free_text_is_scrubbed():
    text = "contact me at john.doe@example.com or +33612345678"
    minimized = minimize({"notes": text}, _policy())
    assert "john.doe@example.com" not in minimized["notes"]
    assert "+33612345678" not in minimized["notes"]


def test_nested_structures_are_processed():
    payload = {"accounts": [{"email": "a@example.com", "api_key": "value"}]}
    account = minimize(payload, _policy())["accounts"][0]
    assert account["api_key"] == REDACTED
    assert account["email"] != "a@example.com"


def test_long_strings_are_truncated():
    minimized = minimize({"bio": "x" * 2000}, _policy())
    assert len(minimized["bio"]) < 600


def test_context_hash_is_stable_and_opaque():
    digest = context_hash({"b": 2, "a": 1})
    assert digest == context_hash({"a": 1, "b": 2})
    assert len(digest) == 64
