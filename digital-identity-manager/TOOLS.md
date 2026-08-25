# Tools

Every third-party tool keeps its own licence and its own terms of use. Read them
before running a scan, and only scan identifiers that belong to you.

## Summary

| Tool | Upstream | Licence | Version pinned | Runs where |
| --- | --- | --- | --- | --- |
| Maigret | <https://github.com/soxoj/maigret> | MIT | `maigret==0.6.4` (PyPI) | `maigret` container, `osint` network |
| Sherlock | <https://github.com/sherlock-project/sherlock> | MIT | `sherlock-project==0.16.0` (PyPI) | `sherlock` container, `osint` network |
| Holehe | <https://github.com/megadose/holehe> | GPL-3.0 | `holehe==1.61` (PyPI) | `holehe` container, `osint` network |
| WhatsMyName | <https://github.com/WebBreacher/WhatsMyName> | CC BY-SA 4.0 (data) | dataset `wmn-data.json` | backend connector (opt-in) |
| Flowsint | <https://github.com/reconurge/flowsint> | Apache-2.0 | not started by this stack | external, file exchange |
| OpenOSINT | operator-provided instance | check upstream | not started by this stack | external, `OPENOSINT_URL` |
| Have I Been Pwned | <https://haveibeenpwned.com/API/v3> | commercial API | — | backend connector (needs a key) |
| Metabase | <https://www.metabase.com/> | AGPL-3.0 / commercial editions | `metabase/metabase:latest` | `metabase` container |

## How the tools are executed

The three CLI tools never run inside the API container. Each has its own image
(`python:3.12-slim`, non-root user) that starts `osint/runner/runner.py`, a
dependency-free HTTP runner:

```
POST /run          x-runner-token: <OSINT_RUNNER_TOKEN>
{ "target": "jdoe", "options": { "timeout": 30 } }
```

The runner validates the target, builds the argument vector from a per-tool
allow-list (`shell=False`), runs the tool in a temporary directory and returns
the report files it produced. Reports are also written to the bind mounts
`maigret/reports/`, `sherlock/reports/` and `holehe/reports/`.

## Maigret

Username reconnaissance across many sites.

Options accepted by the connector: `timeout` (5-120 s, default 30),
`top_sites` (10-3000, default 300), `tags` (lowercase tags).
The runner invokes `maigret <username> --json simple --folderoutput <dir>
--timeout N --top-sites N [--tags TAG …]` and imports the JSON report.

Notes: a large `top_sites` means a lot of outbound requests — start small. Sites
that require authentication are simply reported as such; nothing is bypassed.

## Sherlock

Username reconnaissance, complementary site list.

Options: `timeout` (5-120 s, default 60), `sites` (restrict to given sites),
`nsfw` (include NSFW sites, default off).
The runner invokes `sherlock <username> --csv --folderoutput <dir> --print-found
--timeout N [--site NAME …] [--nsfw]`.

Note: recent Sherlock releases have **no JSON output** (`--json` designates an
input site database), hence the CSV report.

## Holehe

Checks, for one email address, on which sites an account exists — using the
sites' own public "forgotten password" behaviour. It does not log in anywhere.

Options: `timeout` (5-60 s, default 10), `only_used` (default true),
`no_password_recovery` (`-NP`).
The runner invokes `holehe <email> --csv --no-color --no-clear [--only-used]
[-NP] --timeout N` and reads the CSV (`name,domain,rateLimit,exists,
emailrecovery,phoneNumber,others`).

Holehe is GPL-3.0: it is used as an unmodified CLI inside its own image.

## WhatsMyName

The connector downloads the community dataset
(`wmn-data.json`, CC BY-SA 4.0) and tests usernames against the site definitions.
It requires `ALLOW_OUTBOUND_HTTP=true` and is reported as disabled otherwise.

## Domain reconnaissance

WHOIS, DNS records and TLS certificate metadata for the domains **you own**.
Also gated by `ALLOW_OUTBOUND_HTTP`.

## Have I Been Pwned

Breach lookup for your own email addresses. Requires a paid `HIBP_API_KEY`; the
connector sends the mandatory `hibp-api-key` and `user-agent` headers and treats
`404` as "no breach". Disabled when no key is configured.

## Flowsint

Flowsint is an investigation graph platform with **its own datastores**
(PostgreSQL/Redis/Neo4j as documented upstream). This project deliberately does
not try to share its database: run Flowsint separately if you want it, export
your graph, and drop the export in `FLOWSINT_EXPORT_DIR`
(`/data/reports/flowsint`). The connector reads those exports and turns them into
scan results, which you then promote. See `flowsint/README.md`.

## OpenOSINT

Not started automatically, because its licence and its Docker support could not be
verified from a single authoritative source. If you run an instance, set
`OPENOSINT_URL`; the connector then queries it, otherwise it reports itself as
disabled. Exports can also be imported with `scripts/import_openosint.py`.
See `openosint/README.md`.

## Metabase

Secondary analytics console over the same PostgreSQL instance. Its application
database (`METABASE_DB`) is created by `postgres/init/02-metabase-db.sh` on a
fresh volume. Prefer connecting it with the read-only role created by
`postgres/init/03-readonly-role.sql`.

## Adding a tool

1. Write a connector in `backend/app/connectors/` subclassing `Connector`
   (`tool`, `scan_types`, `description`, `requires`, `enabled`, `run()`), and
   return normalised `ScanRecord` objects.
2. If it is a CLI, add an image reusing `osint/runner/runner.py` and declare a
   builder with a strict allow-list of options.
3. Register it in `backend/app/connectors/__init__.py` and document it here,
   with its licence and its terms of use.
