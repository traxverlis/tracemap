"""Feature extraction for the correlation engine.

Entities coming from very different tables (declared identifiers, discovered
accounts, declared profiles) are projected onto a single comparable structure so
the scoring code stays small, pure and unit-testable.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any

from app.services.normalization import (
    NormalizationError,
    normalize_domain,
    normalize_email,
    normalize_name,
    normalize_phone,
    normalize_url,
    normalize_username,
)

STOPWORDS = frozenset(
    """
    a an and the of in on at to for with is are was were i my me we our you your they them
    de la le les des du et un une en sur pour avec est suis mon ma mes nous vous ils elles
    """.split()
)


@dataclass
class EntityFeatures:
    """Comparable projection of an entity of the identity graph."""

    entity_type: str
    entity_id: str
    label: str
    emails: set[str] = field(default_factory=set)
    phones: set[str] = field(default_factory=set)
    usernames: set[str] = field(default_factory=set)
    names: set[str] = field(default_factory=set)
    domains: set[str] = field(default_factory=set)
    urls: set[str] = field(default_factory=set)
    linked_urls: set[str] = field(default_factory=set)
    companies: set[str] = field(default_factory=set)
    cities: set[str] = field(default_factory=set)
    countries: set[str] = field(default_factory=set)
    image_hashes: set[str] = field(default_factory=set)
    perceptual_hashes: set[str] = field(default_factory=set)
    bio_tokens: set[str] = field(default_factory=set)
    platform: str | None = None
    context: dict[str, Any] = field(default_factory=dict)


def safe(normalizer, value: str | None, **kwargs: Any) -> str | None:
    if not value:
        return None
    try:
        return normalizer(value, **kwargs) if kwargs else normalizer(value)
    except (NormalizationError, ValueError):
        return None


def tokenize_bio(text: str | None) -> set[str]:
    if not text:
        return set()
    tokens = re.findall(r"[\w'@#-]{3,}", text.casefold())
    return {token for token in tokens if token not in STOPWORDS}


def domain_of_url(url: str | None) -> str | None:
    normalized = safe(normalize_url, url)
    if not normalized:
        return None
    return safe(normalize_domain, normalized)


def features_from_identity(
    identity: Any,
    identifiers: list[Any],
    profiles: list[Any],
    domains: list[Any],
    companies: list[Any],
    photos: list[Any],
) -> EntityFeatures:
    """Build the reference features of the audited identity."""
    features = EntityFeatures(
        entity_type="identity",
        entity_id=identity.id,
        label=identity.label,
    )
    attributes = identity.attributes or {}
    for name in (
        f"{identity.first_name or ''} {identity.last_name or ''}".strip(),
        *attributes.get("name_variants", []),
    ):
        normalized = safe(normalize_name, name)
        if normalized:
            features.names.add(normalized)
    for alias in attributes.get("known_aliases", []):
        normalized = safe(normalize_username, alias)
        if normalized:
            features.usernames.add(normalized)
    for city in attributes.get("cities", []):
        features.cities.add(city.strip().casefold())
    if identity.country:
        features.countries.add(identity.country.upper())
    features.bio_tokens |= tokenize_bio(attributes.get("notes"))
    features.bio_tokens |= tokenize_bio(identity.description)

    for identifier in identifiers:
        value = identifier.normalized_value
        if identifier.type == "email":
            features.emails.add(value)
            _, _, domain = value.partition("@")
            if domain:
                features.context.setdefault("email_domains", set()).add(domain)
        elif identifier.type == "phone":
            features.phones.add(value)
        elif identifier.type == "username":
            features.usernames.add(value)
        elif identifier.type == "name":
            features.names.add(value)
        elif identifier.type == "domain":
            features.domains.add(value)
        elif identifier.type == "address":
            city = (identifier.attributes or {}).get("city")
            if city:
                features.cities.add(str(city).strip().casefold())

    for profile in profiles:
        if profile.username:
            normalized = safe(normalize_username, profile.username)
            if normalized:
                features.usernames.add(normalized)
        normalized_url = safe(normalize_url, profile.url)
        if normalized_url:
            features.urls.add(normalized_url)
            features.linked_urls.add(normalized_url)

    for domain in domains:
        normalized = safe(normalize_domain, domain.domain)
        if normalized:
            features.domains.add(normalized)

    for company in companies:
        features.companies.add(company.name.strip().casefold())
        normalized = safe(normalize_domain, company.professional_domain or company.website)
        if normalized:
            features.domains.add(normalized)

    for photo in photos:
        features.image_hashes.add(photo.sha256)
        if photo.perceptual_hash:
            features.perceptual_hashes.add(photo.perceptual_hash)

    return features


def _account_label_value(account: Any) -> str:
    return account.username or account.email or account.url or ""


def features_from_account(account: Any) -> EntityFeatures:
    """Project a discovered account onto comparable features."""
    attributes = account.attributes or {}
    features = EntityFeatures(
        entity_type="account",
        entity_id=account.id,
        label=f"{account.platform}: {_account_label_value(account)}".strip(),
        platform=account.platform,
    )
    email = safe(normalize_email, account.email) or safe(normalize_email, attributes.get("email"))
    if email:
        features.emails.add(email)
    phone = safe(normalize_phone, attributes.get("phone"))
    if phone:
        features.phones.add(phone)
    username = safe(normalize_username, account.username)
    if username:
        features.usernames.add(username)
    name = safe(normalize_name, attributes.get("full_name") or attributes.get("display_name"))
    if name:
        features.names.add(name)
    normalized_url = safe(normalize_url, account.url)
    if normalized_url:
        features.urls.add(normalized_url)
    for link in attributes.get("links", []) or []:
        normalized_link = safe(normalize_url, link)
        if normalized_link:
            features.linked_urls.add(normalized_link)
            linked_domain = safe(normalize_domain, normalized_link)
            if linked_domain:
                features.domains.add(linked_domain)
    website_domain = domain_of_url(attributes.get("website"))
    if website_domain:
        features.domains.add(website_domain)
    company = attributes.get("company")
    if company:
        features.companies.add(str(company).strip().casefold())
    location = attributes.get("location")
    if location:
        features.cities.add(str(location).strip().casefold())
    country = attributes.get("country")
    if country and len(str(country)) == 2:
        features.countries.add(str(country).upper())
    avatar_hash = attributes.get("avatar_sha256")
    if avatar_hash:
        features.image_hashes.add(str(avatar_hash))
    avatar_phash = attributes.get("avatar_phash")
    if avatar_phash:
        features.perceptual_hashes.add(str(avatar_phash))
    features.bio_tokens |= tokenize_bio(attributes.get("bio"))
    features.context = {
        "platform": account.platform,
        "username": account.username,
        "url": account.url,
        "source": account.source,
    }
    return features
