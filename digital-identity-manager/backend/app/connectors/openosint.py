"""OpenOSINT connector (optional, HTTP).

Upstream: https://github.com/OpenOSINT/OpenOSINT - an OSINT agent exposing a CLI,
an MCP server and an HTTP mode. Licensing is not a standard OSS licence, so the
service is **never** started automatically by this lab: set ``OPENOSINT_URL``
only if you deployed it yourself and accepted its terms.

The connector speaks a deliberately generic JSON contract so any compatible
aggregator can be plugged in::

    POST {OPENOSINT_URL}/search  {"type": "...", "target": "..."}
    -> {"results": [{"type": ..., "value": ..., "url": ..., "confidence": ...}]}

Results can also be imported offline with ``scripts/import_openosint.py``.
"""

from __future__ import annotations

from typing import Any

import httpx

from app.config import get_settings
from app.connectors.base import Connector, ConnectorDisabled, ConnectorError, ScanRecord


def parse_payload(payload: dict[str, Any] | list[Any]) -> list[ScanRecord]:
    items = payload.get("results") if isinstance(payload, dict) else payload
    if not isinstance(items, list):
        raise ConnectorError("unexpected OpenOSINT payload")
    records: list[ScanRecord] = []
    for item in items:
        if not isinstance(item, dict):
            continue
        try:
            confidence = int(item.get("confidence") or 0)
        except (TypeError, ValueError):
            confidence = 0
        records.append(
            ScanRecord(
                result_type=str(item.get("type") or "finding"),
                value=str(item["value"]) if item.get("value") is not None else None,
                url=str(item["url"]) if item.get("url") else None,
                confidence=max(0, min(100, confidence)),
                raw={**item, "tool": "openosint"},
            )
        )
    return records


class OpenOSINTConnector(Connector):
    tool = "openosint"
    scan_types = ("username", "email", "domain")
    description = "Optional external OSINT aggregator exposing a JSON search endpoint."
    requires = ("OPENOSINT_URL",)

    def __init__(self) -> None:
        settings = get_settings()
        self._url = settings.openosint_url
        self._timeout = settings.osint_request_timeout_seconds

    @property
    def enabled(self) -> bool:
        return bool(self._url)

    def run(self, target: str, parameters: dict[str, Any] | None = None) -> list[ScanRecord]:
        if not self._url:
            raise ConnectorDisabled("OPENOSINT_URL is not configured")
        parameters = parameters or {}
        body = {
            "type": parameters.get("scan_type", "username"),
            "target": target.strip(),
            "options": {
                key: value
                for key, value in parameters.items()
                if key not in {"scan_type"} and isinstance(value, str | int | float | bool)
            },
        }
        try:
            response = httpx.post(
                f"{self._url.rstrip('/')}/search",
                json=body,
                timeout=self._timeout,
                headers={"user-agent": get_settings().http_user_agent},
            )
            response.raise_for_status()
            payload = response.json()
        except (httpx.HTTPError, ValueError) as exc:
            raise ConnectorError(f"OpenOSINT request failed: {exc.__class__.__name__}") from exc
        return parse_payload(payload)
