"""Sherlock connector (username -> accounts).

Upstream: https://github.com/sherlock-project/sherlock (MIT).
Sherlock has no JSON export, so the runner is asked for a CSV report.
"""

from __future__ import annotations

import csv
import io
from typing import Any

from app.config import get_settings
from app.connectors.base import Connector, ConnectorDisabled, RunnerClient, ScanRecord
from app.services.normalization import NormalizationError, normalize_username

DEFAULT_TIMEOUT = 30
CLAIMED_VALUES = {"claimed", "true", "yes", "found", "1"}


def parse_reports(files: dict[str, str]) -> list[ScanRecord]:
    """Parse sherlock CSV (and plain text fallback) reports."""
    records: list[ScanRecord] = []
    seen: set[str] = set()

    for name, content in files.items():
        lowered = name.lower()
        if lowered.endswith(".csv"):
            reader = csv.DictReader(io.StringIO(content))
            for row in reader:
                normalised = {
                    (key or "").strip().lower(): (value or "").strip() for key, value in row.items()
                }
                exists = normalised.get("exists", "").lower()
                if exists and exists not in CLAIMED_VALUES:
                    continue
                site = normalised.get("name") or normalised.get("site") or "unknown"
                url = (
                    normalised.get("url_user")
                    or normalised.get("url")
                    or normalised.get("url_main")
                )
                key = f"{site}|{url}"
                if key in seen:
                    continue
                seen.add(key)
                records.append(
                    ScanRecord(
                        result_type="account",
                        value=site,
                        url=url,
                        confidence=70,
                        raw={"platform": site, "url": url, "tool": "sherlock", **normalised},
                    )
                )
        elif lowered.endswith(".txt"):
            for line in content.splitlines():
                line = line.strip()
                if not line.startswith("http"):
                    continue
                if line in seen:
                    continue
                seen.add(line)
                records.append(
                    ScanRecord(
                        result_type="account",
                        value=line.split("/")[2] if "/" in line else line,
                        url=line,
                        confidence=60,
                        raw={"url": line, "tool": "sherlock"},
                    )
                )
    return records


class SherlockConnector(Connector):
    tool = "sherlock"
    scan_types = ("username",)
    description = "Username search on ~400 public sites (sherlock-project/sherlock)."
    requires = ("sherlock container on the osint network",)

    def __init__(self, client: RunnerClient | None = None) -> None:
        settings = get_settings()
        self._url = settings.sherlock_runner_url
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
            raise ConnectorDisabled("SHERLOCK_RUNNER_URL is not configured")
        parameters = parameters or {}
        try:
            normalize_username(target)
        except NormalizationError as exc:
            raise ConnectorDisabled(str(exc)) from exc

        options = {
            "timeout": int(parameters.get("timeout", DEFAULT_TIMEOUT)),
            "sites": [str(site) for site in parameters.get("sites", [])][:20],
            "nsfw": bool(parameters.get("nsfw", False)),
        }
        response = self._client.run(target.strip(), options)
        records = parse_reports(response.files)
        if not records and response.exit_code not in (0, 1):
            raise ConnectorDisabled(
                f"sherlock exited with code {response.exit_code}: {response.stderr[:200]}"
            )
        return records
