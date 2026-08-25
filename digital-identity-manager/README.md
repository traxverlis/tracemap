# Digital Identity Manager

A private, self-hosted Docker lab to **audit your own digital identity**: build an
inventory of the identifiers you have used over the years, look for the public
traces they left behind, decide yourself which findings are really yours, and
track the removal requests you send.

The web dashboard (React + TypeScript + Vite, served by nginx) is the product.
PostgreSQL is the single source of truth. Metabase is a secondary, technical
console for ad-hoc SQL. The OSINT tools run in their own network, behind a
minimal sandboxed runner.

---

## Scope and lawful use

This project is meant **exclusively** for auditing your own digital identity, or
an identity you have an explicit, documented authorisation to audit.

The application therefore contains **no** feature that:

- bypasses authentication, a CAPTCHA, an anti-bot protection or an access control;
- accesses private data or accounts you do not own;
- scrapes a service against its terms of use.

Every scan target must belong to an identity whose *authorisation acknowledgement*
has been recorded (`identity.authorization_ack`); the API returns `403` otherwise.
Outbound HTTP performed by the API itself is **disabled by default**
(`ALLOW_OUTBOUND_HTTP=false`).

Read [SECURITY.md](SECURITY.md) and [PRIVACY.md](PRIVACY.md) before running anything.

---

## What it does

| Goal | Where |
| --- | --- |
| Inventory names, emails, phones, usernames, addresses, jobs, domains, profiles, photos | `/identity`, `/identifiers`, `/emails`, `/phones`, `/usernames`, `/addresses`, `/professional`, `/domains`, `/profiles`, `/photos` |
| Guided data entry | `/identity/wizard` (10 steps) |
| Username / email account discovery | `/scans` (Maigret, Sherlock, Holehe, WhatsMyName, OpenOSINT) |
| Domain reconnaissance (WHOIS, DNS, certificates) | `/scans` |
| Breach lookup (Have I Been Pwned, optional API key) | `/scans` |
| Data brokers and people-search sites | `/data-brokers` |
| Explainable correlation + human validation | `/relationships` |
| Deletion / opt-out follow-up and reappearance checks | `/deletions` |
| Evidence storage (hash, HTML, screenshot paths) | `/evidence` |
| Explainable completeness score | `/dashboard` |
| Export everything / erase everything | `/settings` |
| Bilingual interface (English / French) | Language switcher in the top bar |

Optional LLM assistance (Claude or OpenAI) can summarise findings and propose
correlations. It is **never required**, it is disabled by default, and every
proposal is stored as an `AI_SUGGESTION` that a human must accept or reject.
Ollama is not used anywhere.

---

## Quick start

Linux, macOS, WSL:

```bash
cd digital-identity-manager
scripts/init-env.sh          # creates .env and generates the required secrets
docker compose up -d --build
```

Windows (PowerShell):

```powershell
cd digital-identity-manager
powershell -ExecutionPolicy Bypass -File scripts\init-env.ps1
docker compose up -d --build
```

`init-env.sh` / `init-env.ps1` copy `.env.example` to `.env` and fill the three
required secrets — `SECRET_KEY`, `OSINT_RUNNER_TOKEN` and `POSTGRES_PASSWORD` —
with fresh random values. Values that are already set are never overwritten, so
the scripts can be run again at any time. Filling `.env` by hand works too; the
stack refuses to start while one of these three is missing or empty:

```
error while interpolating services.postgres.environment.POSTGRES_PASSWORD:
required variable POSTGRES_PASSWORD is missing a value
```

Then open <http://localhost:8080>. The first visit asks you to create the local
administrator account (bootstrap). Metabase, if you started it, listens on
<http://localhost:3000>.

Development mode (hot reload, ports bound to `127.0.0.1` only):

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

See [OPERATIONS.md](OPERATIONS.md) for backups, restores, migrations, imports and
troubleshooting.

---

## Repository layout

```
digital-identity-manager/
├── docker-compose.yml / docker-compose.dev.yml
├── backend/            FastAPI + SQLAlchemy + Alembic (app/, tests/)
├── frontend/           React + TypeScript + Vite dashboard, nginx image
├── osint/runner/       Minimal sandboxed HTTP runner shared by the tool images
├── maigret/ sherlock/ holehe/   Tool images and their report volumes
├── flowsint/ openosint/         Integration notes (external, opt-in projects)
├── postgres/init/      Extensions, Metabase database, read-only role
├── scripts/            Environment bootstrap, report importers, normalisation, correlation, backup/restore
├── data/               Source and data-broker catalogues (CSV, shipped empty)
├── evidence/ reports/  Local artefacts (git-ignored)
└── docs/               Deep dives (API, correlation, completeness, LLM)
```

## Documentation

| File | Content |
| --- | --- |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Containers, networks, data flow, modules |
| [SECURITY.md](SECURITY.md) | Threat model, isolation, authentication, hardening |
| [PRIVACY.md](PRIVACY.md) | GDPR posture, data minimisation, LLM policy, retention |
| [DATABASE.md](DATABASE.md) | Tables, columns, enumerations, migrations |
| [OPERATIONS.md](OPERATIONS.md) | Day-to-day runbook |
| [TOOLS.md](TOOLS.md) | Upstream OSINT tools, licences, flags, limits |
| [docs/API.md](docs/API.md) | REST endpoints |
| [docs/CORRELATION.md](docs/CORRELATION.md) | Scoring method, weights, worked example |
| [docs/COMPLETENESS.md](docs/COMPLETENESS.md) | Completeness score |
| [docs/LLM.md](docs/LLM.md) | LLM abstraction and guarantees |

## Licence

No licence has been chosen for this repository yet; the third-party tools keep
their own licences (see [TOOLS.md](TOOLS.md)).
