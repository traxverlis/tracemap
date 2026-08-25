"""WhatsMyName connector (username -> candidate profile URLs).

Dataset: https://github.com/WebBreacher/WhatsMyName (``wmn-data.json``, CC BY-SA 4.0).

By default the connector only *builds* the list of candidate URLs from the
dataset so the operator can verify them manually. Live verification is opt-in
(``verify: true`` + ``ALLOW_OUTBOUND_HTTP=true``), performs plain unauthenticated
GET requests, is rate limited and never attempts to defeat any protection: a
site answering with a challenge is simply reported as ``unknown``.
"""

from __future__ import annotations

import json
import time
from pathlib import Path
from typing import Any

import httpx

from app.config import get_settings
from app.connectors.base import Connector, ConnectorDisabled, ConnectorError, ScanRecord
from app.services.normalization import NormalizationError, normalize_username

DATASET_PATHS = (
    Path("/data/wmn-data.json"),
    Path("data/wmn-data.json"),
)
DATASET_URL = "https://raw.githubusercontent.com/WebBreacher/WhatsMyName/main/wmn-data.json"
DEFAULT_MAX_SITES = 100
MAX_SITES_LIMIT = 500
DEFAULT_DELAY_SECONDS = 0.5
REQUEST_TIMEOUT = 15


def load_dataset(explicit_path: str | None = None) -> list[dict[str, Any]]:
    """Load ``wmn-data.json`` from disk, or download it when allowed."""
    settings = get_settings()
    candidates = [Path(explicit_path)] if explicit_path else list(DATASET_PATHS)
    for path in candidates:
        if path.is_file():
            try:
                payload = json.loads(path.read_text(encoding="utf-8"))
            except (OSError, json.JSONDecodeError) as exc:
                raise ConnectorError(f"unreadable WhatsMyName dataset: {path}") from exc
            sites = payload.get("sites") if isinstance(payload, dict) else payload
            if isinstance(sites, list):
                return sites
    if not settings.allow_outbound_http:
        raise ConnectorDisabled(
            "wmn-data.json not found locally. Download it once into ./data/ or set "
            "ALLOW_OUTBOUND_HTTP=true to let the backend fetch it."
        )
    try:
        response = httpx.get(
            DATASET_URL,
            timeout=REQUEST_TIMEOUT,
            headers={"user-agent": settings.http_user_agent},
        )
        response.raise_for_status()
        payload = response.json()
    except (httpx.HTTPError, ValueError) as exc:
        raise ConnectorError("could not download the WhatsMyName dataset") from exc
    sites = payload.get("sites") if isinstance(payload, dict) else payload
    if not isinstance(sites, list):
        raise ConnectorError("unexpected WhatsMyName dataset format")
    return sites


def _check_site(client: httpx.Client, site: dict[str, Any], url: str) -> str:
    """Return ``found`` / ``not_found`` / ``unknown`` for one public URL."""
    try:
        response = client.get(url)
    except httpx.HTTPError:
        return "unknown"
    if response.status_code in (401, 403, 429):
        # Protected or rate limited: reported as unknown, never circumvented.
        return "unknown"
    existence_code = site.get("e_code")
    existence_string = site.get("e_string")
    missing_code = site.get("m_code")
    missing_string = site.get("m_string")
    body = response.text if len(response.text) < 400_000 else response.text[:400_000]
    if existence_code is not None and existence_string:
        if response.status_code == existence_code and existence_string in body:
            return "found"
    if missing_code is not None and missing_string:
        if response.status_code == missing_code and missing_string in body:
            return "not_found"
    return "unknown"


class WhatsMyNameConnector(Connector):
    tool = "whatsmyname"
    scan_types = ("username",)
    description = (
        "Builds candidate profile URLs from the WhatsMyName dataset; optional "
        "polite verification of public pages."
    )
    requires = ("data/wmn-data.json (or ALLOW_OUTBOUND_HTTP=true)",)

    @property
    def enabled(self) -> bool:
        return any(path.is_file() for path in DATASET_PATHS) or get_settings().allow_outbound_http

    def run(self, target: str, parameters: dict[str, Any] | None = None) -> list[ScanRecord]:
        settings = get_settings()
        parameters = parameters or {}
        try:
            normalize_username(target)
        except NormalizationError as exc:
            raise ConnectorDisabled(str(exc)) from exc
        username = target.strip()

        sites = load_dataset(parameters.get("dataset_path"))
        max_sites = min(int(parameters.get("max_sites", DEFAULT_MAX_SITES)), MAX_SITES_LIMIT)
        categories = {str(category).lower() for category in parameters.get("categories", [])}
        verify = bool(parameters.get("verify", False)) and settings.allow_outbound_http
        delay = max(float(parameters.get("delay", DEFAULT_DELAY_SECONDS)), 0.1)

        selected: list[tuple[dict[str, Any], str]] = []
        for site in sites:
            if not isinstance(site, dict):
                continue
            if categories and str(site.get("cat", "")).lower() not in categories:
                continue
            uri_check = site.get("uri_check")
            if not uri_check or "{account}" not in uri_check:
                continue
            selected.append((site, uri_check.replace("{account}", username)))
            if len(selected) >= max_sites:
                break

        records: list[ScanRecord] = []
        client: httpx.Client | None = None
        if verify:
            client = httpx.Client(
                timeout=REQUEST_TIMEOUT,
                follow_redirects=True,
                headers={"user-agent": settings.http_user_agent},
            )
        try:
            for site, url in selected:
                status = "candidate"
                if client is not None:
                    status = _check_site(client, site, url)
                    time.sleep(delay)
                    if status == "not_found":
                        continue
                records.append(
                    ScanRecord(
                        result_type="account" if status == "found" else "candidate",
                        value=str(site.get("name") or "unknown"),
                        url=url,
                        confidence=70 if status == "found" else 10,
                        raw={
                            "platform": site.get("name"),
                            "category": site.get("cat"),
                            "url": url,
                            "check_status": status,
                            "tool": "whatsmyname",
                        },
                    )
                )
        finally:
            if client is not None:
                client.close()
        return records
