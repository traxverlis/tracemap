#!/usr/bin/env python3
"""Import an existing Sherlock report (CSV / TXT) into the inventory.

The results are stored as *findings awaiting validation*: nothing is confirmed
automatically.

Usage:
    export DIM_API_TOKEN=...
    python scripts/import_sherlock.py --identity-id <uuid> --username johndoe \\
        sherlock/reports/johndoe.csv
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from _common import ApiClient, ApiError, base_parser, report  # noqa: E402

from app.connectors.sherlock import parse_reports  # noqa: E402


def main() -> int:
    parser = base_parser("Import a Sherlock report")
    parser.add_argument("--username", required=True, help="Username the report was produced for")
    parser.add_argument("reports", nargs="+", help="Sherlock .csv / .txt report files")
    args = parser.parse_args()

    files = {}
    for name in args.reports:
        path = Path(name)
        if not path.is_file():
            print(f"missing report: {path}", file=sys.stderr)
            return 1
        files[path.name] = path.read_text(encoding="utf-8", errors="replace")

    records = parse_reports(files)
    created = 0
    skipped = 0

    client = None if args.dry_run else ApiClient(args.api_url)
    for record in records:
        payload = {
            "identity_id": args.identity_id,
            "source": "sherlock",
            "category": "account",
            "title": f"{record.value} account for {args.username}",
            "value": args.username,
            "url": record.url,
            "confidence": record.confidence,
            "status": "NEW",
            "raw_json": record.raw,
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
