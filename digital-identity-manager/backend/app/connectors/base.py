"""Connector interface shared by every OSINT tool integration.

Design rules:

* a connector only queries **public** endpoints or a local tool container;
* nothing here bypasses authentication, CAPTCHAs, anti-bot protections or
  access controls - if a source requires that, it is documented as
  "manual only" instead;
* every connector returns plain :class:`ScanRecord` objects; persistence and
  human validation happen in the service layer.
"""

from __future__ import annotations

import abc
from dataclasses import dataclass, field
from typing import Any

import httpx


class ConnectorError(RuntimeError):
    """Raised when a tool cannot be reached or returns an unusable result."""


class ConnectorDisabled(ConnectorError):
    """Raised when a connector is not configured in this deployment."""


@dataclass
class ScanRecord:
    """One raw result produced by a tool, before any human validation."""

    result_type: str
    value: str | None = None
    url: str | None = None
    confidence: int = 0
    raw: dict[str, Any] = field(default_factory=dict)


@dataclass
class RunnerResponse:
    exit_code: int
    stdout: str
    stderr: str
    files: dict[str, str]


class RunnerClient:
    """Minimal HTTP client for the sandboxed tool runners.

    The runners live on the ``osint`` docker network, execute a single
    hard-coded binary with an argument allow-list and never expose a shell.
    """

    def __init__(self, base_url: str, token: str | None = None, timeout: int = 900) -> None:
        self.base_url = base_url.rstrip("/")
        self.token = token
        self.timeout = timeout

    def run(self, target: str, options: dict[str, Any] | None = None) -> RunnerResponse:
        headers = {"content-type": "application/json"}
        if self.token:
            headers["x-runner-token"] = self.token
        try:
            response = httpx.post(
                f"{self.base_url}/run",
                json={"target": target, "options": options or {}},
                headers=headers,
                timeout=self.timeout,
            )
            response.raise_for_status()
            payload = response.json()
        except httpx.HTTPError as exc:
            raise ConnectorError(f"tool runner unreachable: {exc.__class__.__name__}") from exc
        except ValueError as exc:
            raise ConnectorError("tool runner returned a malformed response") from exc

        return RunnerResponse(
            exit_code=int(payload.get("exit_code", -1)),
            stdout=str(payload.get("stdout", "")),
            stderr=str(payload.get("stderr", "")),
            files={
                str(item["name"]): str(item.get("content", "")) for item in payload.get("files", [])
            },
        )

    def healthy(self) -> bool:
        try:
            response = httpx.get(f"{self.base_url}/health", timeout=5)
            return response.status_code == 200
        except httpx.HTTPError:
            return False


class Connector(abc.ABC):
    """Base class for every tool integration."""

    tool: str = "unknown"
    scan_types: tuple[str, ...] = ()
    description: str = ""
    requires: tuple[str, ...] = ()

    @property
    def enabled(self) -> bool:
        return True

    @abc.abstractmethod
    def run(self, target: str, parameters: dict[str, Any] | None = None) -> list[ScanRecord]:
        """Execute the tool against ``target`` and return raw records."""

    def describe(self) -> dict[str, Any]:
        return {
            "tool": self.tool,
            "scan_types": list(self.scan_types),
            "enabled": self.enabled,
            "description": self.description,
            "requires": list(self.requires),
        }
