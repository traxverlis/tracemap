"""Shared helpers for the CLI import / maintenance scripts.

The scripts talk to the running API instead of the database directly: this way
every write goes through the same validation, normalisation and audit logging
as the dashboard.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.request
from typing import Any

DEFAULT_API = os.environ.get("DIM_API_URL", "http://localhost:8000/api")


class ApiError(RuntimeError):
    pass


class ApiClient:
    def __init__(self, base_url: str | None = None, token: str | None = None) -> None:
        self.base_url = (base_url or DEFAULT_API).rstrip("/")
        self.token = token or os.environ.get("DIM_API_TOKEN", "")
        if not self.token:
            raise ApiError(
                "No API token. Export DIM_API_TOKEN (see POST /api/auth/login) first."
            )

    def _request(self, method: str, path: str, payload: Any = None) -> Any:
        url = f"{self.base_url}{path}"
        data = json.dumps(payload).encode("utf-8") if payload is not None else None
        request = urllib.request.Request(url, data=data, method=method)  # noqa: S310
        request.add_header("content-type", "application/json")
        request.add_header("authorization", "Bearer " + self.token)
        try:
            with urllib.request.urlopen(request, timeout=60) as response:  # noqa: S310
                body = response.read().decode("utf-8")
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")
            raise ApiError(f"{method} {path} -> HTTP {exc.code}: {detail[:500]}") from exc
        except urllib.error.URLError as exc:
            raise ApiError(f"{method} {path} -> {exc.reason}") from exc
        return json.loads(body) if body else None

    def get(self, path: str) -> Any:
        return self._request("GET", path)

    def post(self, path: str, payload: Any) -> Any:
        return self._request("POST", path, payload)

    def patch(self, path: str, payload: Any) -> Any:
        return self._request("PATCH", path, payload)


def base_parser(description: str) -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=description)
    parser.add_argument("--api-url", default=DEFAULT_API, help="API base URL")
    parser.add_argument("--identity-id", required=True, help="Target identity UUID")
    parser.add_argument(
        "--dry-run", action="store_true", help="Print what would be imported and exit"
    )
    return parser


def report(created: int, skipped: int, dry_run: bool) -> None:
    prefix = "[dry-run] " if dry_run else ""
    print(f"{prefix}{created} result(s) imported, {skipped} skipped", file=sys.stderr)
