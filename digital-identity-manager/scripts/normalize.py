#!/usr/bin/env python3
"""Recompute the normalised form of every identifier.

Useful after an upgrade of the normalisation rules. The original value entered
by the operator is never modified.

Usage:
    python scripts/normalize.py --database-url postgresql+psycopg://... [--apply]
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from sqlalchemy import create_engine, select  # noqa: E402
from sqlalchemy.orm import Session  # noqa: E402

from app.models import Identifier, Identity  # noqa: E402
from app.services.normalization import NormalizationError, normalize_identifier  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description="Recompute normalised identifier values")
    parser.add_argument(
        "--database-url",
        default=os.environ.get("DATABASE_URL"),
        help="SQLAlchemy URL (defaults to $DATABASE_URL)",
    )
    parser.add_argument("--apply", action="store_true", help="Persist the changes")
    args = parser.parse_args()

    if not args.database_url:
        print("--database-url or $DATABASE_URL is required", file=sys.stderr)
        return 1

    engine = create_engine(args.database_url, future=True)
    changed = 0
    failed = 0

    with Session(engine) as session:
        countries = {
            identity.id: identity.country
            for identity in session.scalars(select(Identity))
        }
        for identifier in session.scalars(select(Identifier)):
            try:
                normalized = normalize_identifier(
                    identifier.type, identifier.value, countries.get(identifier.identity_id)
                )
            except NormalizationError as exc:
                # The raw value is never printed: only the type and the id.
                print(f"{identifier.id} ({identifier.type}): {exc.__class__.__name__}",
                      file=sys.stderr)
                failed += 1
                continue
            if normalized != identifier.normalized_value:
                changed += 1
                if args.apply:
                    identifier.normalized_value = normalized
        if args.apply:
            session.commit()

    action = "updated" if args.apply else "would be updated"
    print(f"{changed} identifier(s) {action}, {failed} could not be normalised")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
