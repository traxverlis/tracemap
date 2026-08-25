"""Normalization layer."""

from __future__ import annotations

import pytest

from app.services.normalization import (
    NormalizationError,
    mask_email,
    mask_phone,
    normalize_domain,
    normalize_email,
    normalize_identifier,
    normalize_phone,
    normalize_url,
    normalize_username,
)


def test_normalize_email_lowercases_and_trims():
    assert normalize_email("  John.Doe@Example.COM ") == "john.doe@example.com"


def test_normalize_email_rejects_invalid():
    with pytest.raises(NormalizationError):
        normalize_email("not-an-email")


def test_normalize_username_makes_separator_variants_comparable():
    assert normalize_username("  John_Doe ") == "johndoe"
    assert normalize_username("John.Doe") == "johndoe"
    assert normalize_username("Jöhn") == "john"


def test_normalize_phone_e164():
    assert normalize_phone("06 12 34 56 78", "FR") == "+33612345678"
    assert normalize_phone("+33 6 12 34 56 78") == "+33612345678"


def test_normalize_phone_keeps_digits_when_unparseable():
    # A partial number stays reviewable instead of being dropped.
    assert normalize_phone("06 12 34") == "061234"


def test_normalize_phone_rejects_impossible_numbers():
    with pytest.raises(NormalizationError):
        normalize_phone("+33 6 12 34")


def test_normalize_domain_strips_scheme_and_www():
    assert normalize_domain("https://WWW.Example.com/path") == "example.com"


def test_normalize_url_drops_tracking_parameters():
    normalized = normalize_url("https://Example.com/Page/?utm_source=x&id=7#frag")
    assert normalized == "https://example.com/Page?id=7"


def test_normalize_identifier_dispatch():
    assert normalize_identifier("email", "A@B.COM") == "a@b.com"
    assert normalize_identifier("username", " Bob ") == "bob"
    assert normalize_identifier("name", "  Jean   Dupont ") == "jean dupont"


def test_masking_never_leaks_full_values():
    masked_phone = mask_phone("+33612345678")
    assert "612345" not in masked_phone
    assert masked_phone.endswith("78")

    masked_email = mask_email("john.doe@example.com")
    assert "john.doe" not in masked_email
    assert masked_email.endswith("@example.com")
