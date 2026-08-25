"""Maigret connector (username -> accounts).

Upstream: https://github.com/soxoj/maigret (MIT).
The tool runs inside the ``maigret`` container on the ``osint`` network; the
backend only sends a username and parses the JSON reports that come back.
"""

from __future__ import annotations

import json
from typing import Any

from app.config import get_settings
from app.connectors.base import Connector, ConnectorDisabled, RunnerClient, ScanRecord
from app.services.normalization import NormalizationError, normalize_username

DEFAULT_TOP_SITES = 300
DEFAULT_TIMEOUT = 30
MAX_TOP_SITES = 3000


def parse_reports(files: dict[str, str]) -> list[ScanRecord]:
    """Parse maigret JSON / NDJSON reports defensively.

    Report file names change between versions, so every ``.json``/``.ndjson``
    file returned by the runner is inspected.
    """
    records: list[ScanRecord] = []
    seen: set[str] = set()

    def add(site: str, payload: dict[str, Any]) -> None:
        status = payload.get("status") or {}
        if isinstance(status, dict):
            state = str(status.get("status") or "").lower()
        else:
            state = str(status).lower()
        if state and state not in {"claimed", "found"}:
            return
        url = payload.get("url_user") or payload.get("url") or payload.get("url_main")
        key = f"{site}|{url}"
        if key in seen:
            return
        seen.add(key)
        ids = status.get("ids") if isinstance(status, dict) else None
        records.append(
            ScanRecord(
                result_type="account",
                value=site,
                url=url,
                confidence=70,
                raw={
                    "platform": site,
                    "url": url,
                    "tags": (status.get("tags") if isinstance(status, dict) else None) or [],
                    "ids": ids or {},
                    "tool": "maigret",
                },
            )
        )

    for name, content in files.items():
        lowered = name.lower()
        if not (lowered.endswith(".json") or lowered.endswith(".ndjson")):
            continue
        if lowered.endswith(".ndjson"):
            for line in content.splitlines():
                line = line.strip()
                if not line:
                    continue
                try:
                    payload = json.loads(line)
                except json.JSONDecodeError:
                    continue
                if isinstance(payload, dict):
                    site = str(payload.get("sitename") or payload.get("site") or "unknown")
                    add(site, payload)
            continue
        try:
            payload = json.loads(content)
        except json.JSONDecodeError:
            continue
        if isinstance(payload, dict):
            for site, site_payload in payload.items():
                if isinstance(site_payload, dict):
                    add(str(site), site_payload)
        elif isinstance(payload, list):
            for item in payload:
                if isinstance(item, dict):
                    add(str(item.get("sitename") or item.get("site") or "unknown"), item)
    return records


class MaigretConnector(Connector):
    tool = "maigret"
    scan_types = ("username",)
    description = "Username search across a large catalogue of public sites (soxoj/maigret)."
    requires = ("maigret container on the osint network",)

    def __init__(self, client: RunnerClient | None = None) -> None:
        settings = get_settings()
        self._url = settings.maigret_runner_url
        self._client = client or (
            RunnerClient(
                self._url, settings.osint_runner_token, settings.osint_request_timeout_seconds
            )
            if self._url
            else None
        )

    @property
    def enabled(self) -> bool:
        return self._client is not None

    def run(self, target: str, parameters: dict[str, Any] | None = None) -> list[ScanRecord]:
        if self._client is None:
            raise ConnectorDisabled("MAIGRET_RUNNER_URL is not configured")
        parameters = parameters or {}
        try:
            username = normalize_username(target)
        except NormalizationError as exc:
            raise ConnectorDisabled(str(exc)) from exc
        if not username:
            raise ConnectorDisabled("empty username")

        options = {
            "top_sites": min(int(parameters.get("top_sites", DEFAULT_TOP_SITES)), MAX_TOP_SITES),
            "timeout": int(parameters.get("timeout", DEFAULT_TIMEOUT)),
            "tags": [str(tag) for tag in parameters.get("tags", [])][:10],
        }
        response = self._client.run(target.strip(), options)
        records = parse_reports(response.files)
        if not records and response.exit_code not in (0, 1):
            raise ConnectorDisabled(
                f"maigret exited with code {response.exit_code}: {response.stderr[:200]}"
            )
        return records
