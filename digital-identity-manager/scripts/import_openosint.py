#!/usr/bin/env python3
"""Import an OpenOSINT export into the inventory.

OpenOSINT is **not** started by ``docker-compose.yml``: check its licence and
terms of use, run your own instance, then export its results as JSON and import
them here. Every imported row lands in the review queue.

Expected JSON shape (list, or ``{"results": [...]}``)::

    [{"source": "...", "category": "...", "title": "...", "value": "...",
      "url": "...", "confidence": 50}]

Usage:
    export DIM_API_TOKEN=...
    python scripts/import_openosint.py --identity-id <uuid> export.json
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from _common import ApiClient, ApiError, base_parser, report  # noqa: E402

ALLOWED_CATEGORIES = {
    "account",
    "profile",
    "mention",
    "data_broker",
    "breach",
    "document",
    "other",
}


def load_rows(path: Path) -> list[dict]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(payload, dict):
        payload = payload.get("results") or payload.get("data") or []
    if not isinstance(payload, list):
        raise ValueError(f"{path}: expected a JSON list of results")
    return [row for row in payload if isinstance(row, dict)]


def main() -> int:
    parser = base_parser("Import an OpenOSINT export")
    parser.add_argument("exports", nargs="+", help="OpenOSINT JSON export files")
    args = parser.parse_args()

    rows: list[dict] = []
    for name in args.exports:
        path = Path(name)
        if not path.is_file():
            print(f"missing export: {path}", file=sys.stderr)
            return 1
        rows.extend(load_rows(path))

    client = None if args.dry_run else ApiClient(args.api_url)
    created = 0
    skipped = 0

    for row in rows:
        title = str(row.get("title") or row.get("name") or "").strip()
        if not title:
            skipped += 1
            continue
        category = str(row.get("category") or "other").lower()
        payload = {
            "identity_id": args.identity_id,
            "source": str(row.get("source") or "openosint"),
            "category": category if category in ALLOWED_CATEGORIES else "other",
            "title": title[:300],
            "value": (str(row["value"])[:500] if row.get("value") else None),
            "url": (str(row["url"])[:500] if row.get("url") else None),
            "confidence": max(0, min(int(row.get("confidence") or 30), 100)),
            "status": "NEW",
            "raw_json": row,
        }
        if args.dry_run:
            print(payload)
            created += 1
            continue
        try:
            client.post("/findings", payload)
            created += 1
        except ApiError as exc:
            print(exc, file=sys.stderr)
            skipped += 1

    report(created, skipped, args.dry_run)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
