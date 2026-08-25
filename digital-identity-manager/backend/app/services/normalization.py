"""Normalisation layer.

The original value entered by the operator is always preserved; a normalised
representation is stored alongside it and used for matching and correlation.
"""

from __future__ import annotations

import hashlib
import re
import unicodedata
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

import phonenumbers
from phonenumbers import NumberParseException

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s.]+(\.[^@\s.]+)+$")
DOMAIN_RE = re.compile(r"^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$")

# Tracking parameters that are always safe to drop from a URL.
TRACKING_PARAMS = frozenset(
    {
        "utm_source",
        "utm_medium",
        "utm_campaign",
        "utm_term",
        "utm_content",
        "utm_id",
        "gclid",
        "fbclid",
        "msclkid",
        "mc_cid",
        "mc_eid",
        "igshid",
        "ref_src",
        "ref_url",
    }
)


class NormalizationError(ValueError):
    """Raised when a value cannot be normalised for its declared type."""


def sha256_hex(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def normalize_email(value: str) -> str:
    """Lowercase + trim. Sub-addressing and dots are preserved on purpose:
    they can be significant for some providers."""
    email = value.strip().lower()
    if not EMAIL_RE.match(email):
        raise NormalizationError(f"invalid email address: {value!r}")
    return email


def email_local_and_domain(value: str) -> tuple[str, str]:
    local, _, domain = normalize_email(value).partition("@")
    return local, domain


def normalize_username(value: str) -> str:
    """Case-folded, accent-folded username with separators removed.

    ``John.Doe`` , ``john_doe`` and ``johndoe`` share the same normalised form,
    which makes them comparable without losing the original spelling.
    """
    username = value.strip()
    if not username:
        raise NormalizationError("empty username")
    folded = unicodedata.normalize("NFKD", username)
    folded = "".join(ch for ch in folded if not unicodedata.combining(ch))
    folded = folded.casefold()
    return re.sub(r"[^a-z0-9]+", "", folded) or folded


def normalize_phone(value: str, country: str | None = None) -> str:
    """Return the E.164 representation when possible.

    When the number cannot be parsed (unknown country, partial number) the
    digits are kept so the value is still stored and reviewable.
    """
    raw = value.strip()
    if not raw:
        raise NormalizationError("empty phone number")
    try:
        parsed = phonenumbers.parse(raw, (country or None) and country.upper())
    except NumberParseException:
        digits = re.sub(r"\D", "", raw)
        if not digits:
            raise NormalizationError(f"invalid phone number: {mask_phone(raw)}") from None
        return f"+{digits}" if raw.startswith("+") else digits
    if not phonenumbers.is_possible_number(parsed):
        raise NormalizationError(f"invalid phone number: {mask_phone(raw)}")
    return phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)


def mask_phone(value: str) -> str:
    """Mask a phone number for logs / UI listings (never log full numbers)."""
    digits = re.sub(r"\D", "", value or "")
    if len(digits) <= 4:
        return "*" * len(digits)
    return f"{'*' * (len(digits) - 4)}{digits[-4:]}"


def mask_email(value: str) -> str:
    """``john.doe@example.com`` -> ``j******e@example.com``."""
    local, _, domain = (value or "").partition("@")
    if not domain:
        return "***"
    if len(local) <= 2:
        return f"{local[:1]}***@{domain}"
    return f"{local[0]}{'*' * (len(local) - 2)}{local[-1]}@{domain}"


def normalize_name(value: str) -> str:
    name = " ".join(value.split())
    if not name:
        raise NormalizationError("empty name")
    folded = unicodedata.normalize("NFKD", name)
    folded = "".join(ch for ch in folded if not unicodedata.combining(ch))
    return re.sub(r"[^a-z0-9 ]+", " ", folded.casefold()).strip()


def normalize_address(value: str) -> str:
    address = " ".join(value.split())
    if not address:
        raise NormalizationError("empty address")
    folded = unicodedata.normalize("NFKD", address)
    folded = "".join(ch for ch in folded if not unicodedata.combining(ch))
    return re.sub(r"[^a-z0-9 ]+", " ", folded.casefold()).strip()


def normalize_domain(value: str) -> str:
    domain = value.strip().lower()
    if "//" in domain:
        domain = urlsplit(domain).netloc or domain
    domain = domain.split("/")[0].split("@")[-1]
    domain = domain.removeprefix("www.").rstrip(".")
    if ":" in domain:
        domain = domain.split(":", 1)[0]
    try:
        domain = domain.encode("idna").decode("ascii")
    except UnicodeError:
        pass
    if not DOMAIN_RE.match(domain):
        raise NormalizationError(f"invalid domain: {value!r}")
    return domain


def normalize_url(value: str) -> str:
    """Normalise a URL conservatively.

    Only well-known tracking parameters are removed - any other query
    parameter may be meaningful and is kept.
    """
    raw = value.strip()
    if not raw:
        raise NormalizationError("empty url")
    if "://" not in raw:
        raw = f"https://{raw}"
    parts = urlsplit(raw)
    if parts.scheme not in {"http", "https"}:
        raise NormalizationError(f"unsupported url scheme: {parts.scheme!r}")
    netloc = parts.netloc.lower()
    if netloc.endswith(":80") and parts.scheme == "http":
        netloc = netloc[:-3]
    if netloc.endswith(":443") and parts.scheme == "https":
        netloc = netloc[:-4]
    query = [
        (k, v)
        for k, v in parse_qsl(parts.query, keep_blank_values=True)
        if k.lower() not in TRACKING_PARAMS
    ]
    path = parts.path or "/"
    if len(path) > 1 and path.endswith("/"):
        path = path.rstrip("/")
    return urlunsplit((parts.scheme, netloc, path, urlencode(query), ""))


NORMALIZERS = {
    "email": lambda value, **kw: normalize_email(value),
    "username": lambda value, **kw: normalize_username(value),
    "phone": lambda value, **kw: normalize_phone(value, kw.get("country")),
    "name": lambda value, **kw: normalize_name(value),
    "address": lambda value, **kw: normalize_address(value),
    "domain": lambda value, **kw: normalize_domain(value),
}


def normalize_identifier(identifier_type: str, value: str, country: str | None = None) -> str:
    """Normalise ``value`` according to its identifier type."""
    normalizer = NORMALIZERS.get(identifier_type)
    if normalizer is None:
        raise NormalizationError(f"unknown identifier type: {identifier_type!r}")
    return normalizer(value, country=country)
