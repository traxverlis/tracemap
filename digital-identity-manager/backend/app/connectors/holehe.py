"""Holehe connector (email -> sites where the address is registered).

Upstream: https://github.com/megadose/holehe (GPL-3.0).
Holehe only tells whether an address is *registered* on a site through the
public sign-up / password-recovery flows; it never accesses an account.
"""

from __future__ import annotations

import csv
import io
from typing import Any

from app.config import get_settings
from app.connectors.base import Connector, ConnectorDisabled, RunnerClient, ScanRecord
from app.services.normalization import NormalizationError, normalize_email

DEFAULT_TIMEOUT = 15
TRUE_VALUES = {"true", "1", "yes"}


def parse_reports(files: dict[str, str]) -> list[ScanRecord]:
    """Parse the holehe CSV report (``name,domain,rateLimit,exists,...``)."""
    records: list[ScanRecord] = []
    for name, content in files.items():
        if not name.lower().endswith(".csv"):
            continue
        reader = csv.DictReader(io.StringIO(content))
        for row in reader:
            normalised = {
                (key or "").strip().lower(): (value or "").strip() for key, value in row.items()
            }
            if normalised.get("exists", "").lower() not in TRUE_VALUES:
                continue
            site = normalised.get("name") or normalised.get("domain") or "unknown"
            domain = normalised.get("domain")
            records.append(
                ScanRecord(
                    result_type="account",
                    value=site,
                    url=f"https://{domain}" if domain else None,
                    confidence=80,
                    raw={
                        "platform": site,
                        "domain": domain,
                        "rate_limited": normalised.get("ratelimit", "").lower() in TRUE_VALUES,
                        # Holehe returns partially masked recovery hints only.
                        "email_recovery_hint": normalised.get("emailrecovery") or None,
                        "phone_hint": normalised.get("phonenumber") or None,
                        "tool": "holehe",
                    },
                )
            )
    return records


class HoleheConnector(Connector):
    tool = "holehe"
    scan_types = ("email",)
    description = "Checks on which public sites an email address is registered (megadose/holehe)."
    requires = ("holehe container on the osint network",)

    def __init__(self, client: RunnerClient | None = None) -> None:
        settings = get_settings()
        self._url = settings.holehe_runner_url
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
            raise ConnectorDisabled("HOLEHE_RUNNER_URL is not configured")
        parameters = parameters or {}
        try:
            email = normalize_email(target)
        except NormalizationError as exc:
            raise ConnectorDisabled(str(exc)) from exc

        options = {
            "timeout": int(parameters.get("timeout", DEFAULT_TIMEOUT)),
            "only_used": bool(parameters.get("only_used", True)),
            "no_password_recovery": bool(parameters.get("no_password_recovery", False)),
        }
        response = self._client.run(email, options)
        records = parse_reports(response.files)
        if not records and response.exit_code not in (0, 1):
            raise ConnectorDisabled(
                f"holehe exited with code {response.exit_code}: {response.stderr[:200]}"
            )
        return records
