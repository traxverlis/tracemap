"""Breach lookup connector (Have I Been Pwned API v3).

Only the operator's own addresses may be queried. ``/breachedaccount`` requires
a paid API key; without one the connector stays disabled and the operator can
still record breaches manually from https://haveibeenpwned.com.
"""

from __future__ import annotations

from typing import Any
from urllib.parse import quote

import httpx

from app.config import get_settings
from app.connectors.base import Connector, ConnectorDisabled, ConnectorError, ScanRecord
from app.services.normalization import NormalizationError, normalize_email


class BreachConnector(Connector):
    tool = "hibp"
    scan_types = ("breach",)
    description = "Checks your own email addresses against Have I Been Pwned (API v3)."
    requires = ("HIBP_API_KEY", "ALLOW_OUTBOUND_HTTP=true")

    @property
    def enabled(self) -> bool:
        settings = get_settings()
        return bool(settings.hibp_api_key) and settings.allow_outbound_http

    def run(self, target: str, parameters: dict[str, Any] | None = None) -> list[ScanRecord]:
        settings = get_settings()
        if not settings.allow_outbound_http:
            raise ConnectorDisabled("ALLOW_OUTBOUND_HTTP is disabled")
        if not settings.hibp_api_key:
            raise ConnectorDisabled(
                "HIBP_API_KEY is required for breach lookups (paid subscription)."
            )
        try:
            email = normalize_email(target)
        except NormalizationError as exc:
            raise ConnectorDisabled(str(exc)) from exc

        url = f"{settings.hibp_api_base.rstrip('/')}/breachedaccount/{quote(email, safe='')}"
        try:
            response = httpx.get(
                url,
                params={"truncateResponse": "false"},
                headers={
                    "hibp-api-key": settings.hibp_api_key,
                    "user-agent": settings.http_user_agent,
                },
                timeout=30,
            )
        except httpx.HTTPError as exc:
            raise ConnectorError(f"HIBP request failed: {exc.__class__.__name__}") from exc

        if response.status_code == 404:
            return []
        if response.status_code == 429:
            raise ConnectorError("HIBP rate limit reached, retry later")
        if response.status_code >= 400:
            raise ConnectorError(f"HIBP returned HTTP {response.status_code}")

        try:
            payload = response.json()
        except ValueError as exc:
            raise ConnectorError("HIBP returned a malformed response") from exc

        records: list[ScanRecord] = []
        for breach in payload if isinstance(payload, list) else []:
            if not isinstance(breach, dict):
                continue
            records.append(
                ScanRecord(
                    result_type="breach",
                    value=str(breach.get("Name") or breach.get("Title") or "unknown"),
                    url=f"https://haveibeenpwned.com/PwnedWebsites#{breach.get('Name', '')}",
                    confidence=90,
                    raw={
                        "name": breach.get("Name"),
                        "title": breach.get("Title"),
                        "domain": breach.get("Domain"),
                        "breach_date": breach.get("BreachDate"),
                        "data_classes": breach.get("DataClasses"),
                        "is_verified": breach.get("IsVerified"),
                        "tool": "hibp",
                    },
                )
            )
        return records
