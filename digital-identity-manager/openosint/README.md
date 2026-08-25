# OpenOSINT integration

OpenOSINT is supported as an **operator-provided, external instance**. This stack
never starts it, for two reasons:

- its licence and its official Docker support could not be verified from a single
  authoritative source at the time of writing;
- running an unverified OSINT service inside a privacy lab would contradict the
  purpose of the project.

## Enabling it

1. Review the upstream project: its licence, its terms of use and what it queries.
2. Run your own instance, on a network you control.
3. Set `OPENOSINT_URL` in `.env` (for example `http://openosint:8000`) and, if the
   instance is not reachable from the `osint` network, attach it there.
4. Restart the backend. `GET /api/scans/tools` will report `openosint` as enabled.

While `OPENOSINT_URL` is empty the connector reports itself as disabled and the
tool is greyed out in the dashboard.

## Offline import

If you prefer to run it by hand, export the results and import them:

```bash
python scripts/import_openosint.py --identity-id <uuid> \
    --database-url "$DATABASE_URL" reports/openosint/*.json
```

The importer accepts a JSON list, or an object with a `results` or `data` list.
Each row becomes a scan result attached to an imported scan, so it follows the
same promotion, correlation and audit path as any other tool.

## Notes

- Only query identifiers that belong to you.
- Respect the rate limits and the terms of the services the instance contacts.
