#!/usr/bin/env python3
"""Run the correlation engine for one identity.

Suggestions are written with status ``SUGGESTED``; a human decision is still
required before anything is considered confirmed.

Usage:
    python scripts/correlate.py --identity-id <uuid> --database-url postgresql+psycopg://...
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import Session  # noqa: E402

from app.correlation.engine import run_correlation  # noqa: E402
from app.models import Identity  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description="Run the correlation engine")
    parser.add_argument("--identity-id", required=True)
    parser.add_argument("--database-url", default=os.environ.get("DATABASE_URL"))
    args = parser.parse_args()

    if not args.database_url:
        print("--database-url or $DATABASE_URL is required", file=sys.stderr)
        return 1

    engine = create_engine(args.database_url, future=True)
    with Session(engine) as session:
        identity = session.get(Identity, args.identity_id)
        if identity is None:
            print(f"identity {args.identity_id} not found", file=sys.stderr)
            return 1
        relationships, created, updated = run_correlation(session, identity)
        session.commit()

    print(
        f"{created} suggestion(s) created, {updated} updated, "
        f"{len(relationships)} relationship(s) awaiting your review"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
