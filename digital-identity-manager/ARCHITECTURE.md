# Architecture

## Overview

```
                                 INTERNET
                                     │
        ┌────────────────────────────┼───────────────────────────┐
        │                            │                           │
   (opt-in, external)           osint network              (opt-in egress
   Flowsint / OpenOSINT      maigret · sherlock · holehe    of the API itself)
        │  file exports              │                           │
        └──────────────┬─────────────┴───────────────┬───────────┘
                       │                             │
                       ▼                             ▼
                 ┌───────────────────────────────────────────┐
                 │             backend network               │
                 │        (docker "internal: true")          │
                 │                                           │
                 │   FastAPI  ───────────►  PostgreSQL       │
                 │   workers                (source of truth)│
                 │      │                        ▲           │
                 │      │                        │           │
                 │   evidence / reports /     Metabase       │
                 │   photos volumes           (read-only role│
                 │                             recommended)  │
                 └───────────────┬───────────────────────────┘
                                 │
                          frontend network
                                 │
                       nginx + React dashboard
                        (only published port)
```

## Containers

| Service | Image / build | Networks | Published | Role |
| --- | --- | --- | --- | --- |
| `postgres` | `postgres:16-alpine` | `backend` | **none** | Source of truth. Port 5432 stays inside the internal network. |
| `backend` | `./backend` (Python 3.12) | `backend`, `osint` | none | FastAPI REST API, scan workers, correlation engine, optional LLM client. |
| `frontend` | `./frontend` (node build → nginx) | `frontend`, `backend` | `8080` | Serves the SPA and reverse-proxies `/api` to `backend:8000`. |
| `metabase` | `metabase/metabase:latest` | `backend`, `frontend` | `3000` | Secondary analytics console. Its application database is created by `postgres/init/02-metabase-db.sh`. |
| `maigret` | `maigret/Dockerfile` | `osint` | none | Username search, behind the sandboxed runner. |
| `sherlock` | `sherlock/Dockerfile` | `osint` | none | Username search, behind the sandboxed runner. |
| `holehe` | `holehe/Dockerfile` | `osint` | none | Email → account existence checks, behind the sandboxed runner. |

The three networks implement the requested separation:

- **frontend** — the only network with a published HTTP port.
- **backend** — `internal: true`, therefore **no route to the Internet at all**.
  PostgreSQL, the API and Metabase live here.
- **osint** — the tool runners. The API is attached to it too, which is the only
  path it has to the Internet; that egress is still gated by
  `ALLOW_OUTBOUND_HTTP` inside the application.

## Backend modules (`backend/app/`)

| Package | Responsibility |
| --- | --- |
| `config.py` | Typed settings (Pydantic). Refuses the development secret when `ENVIRONMENT=production`. |
| `database.py` | Sync SQLAlchemy 2.0 engine and session factory. |
| `security.py` | Argon2id password hashing, password policy, JWT access tokens. |
| `models/` | ORM models (`identity`, `osint`, `privacy`, `ai`) and the shared `StrEnum` vocabularies. |
| `schemas/` | Pydantic request/response models. |
| `api/` | Routers: auth, identity, inventory, findings, relationships, scans, privacy, overview, ai, settings. |
| `services/` | Business logic: normalization, scans, relationships, completeness, dashboard, graph, timeline, photos, privacy (export/erase), audit, ai. |
| `connectors/` | One adapter per tool: `maigret`, `sherlock`, `holehe`, `whatsmyname`, `openosint`, `flowsint`, `domain` (WHOIS/DNS/TLS), `breaches` (HIBP). Each declares whether it is enabled. |
| `correlation/` | `rules.py` (weights), `features.py` (entity feature extraction), `engine.py` (noisy-OR scoring, relationship upserts). |
| `llm/` | `base.py` (provider protocol), `disabled.py`, `claude.py`, `openai.py`, `factory.py`, `minimization.py`, `prompts.py`. |
| `workers/` | `scan_worker.py` (polls the `scans` queue), `scheduler.py` (re-checks deletions and reappearances). |

## Data flow

1. **Inventory** — the operator enters identifiers through the dashboard or the
   wizard. `services/normalization.py` computes the normalised form
   (lowercased email, E.164 phone, separator-free username, canonical URL) while
   keeping the original value.
2. **Authorisation** — a scan can only be created for an identity whose
   authorisation acknowledgement is recorded.
3. **Scan** — a row is inserted in `scans` with status `PENDING`. The scan worker
   claims it (`SELECT … FOR UPDATE SKIP LOCKED`), calls the connector, and stores
   raw results in `scan_results`.
4. **Promotion** — the operator promotes selected results into `accounts` /
   `findings`. Nothing is promoted automatically.
5. **Correlation** — `POST /api/correlation/run` compares entities, produces
   explainable scores and writes `SUGGESTED` relationships.
6. **Human validation** — the review queue asks a question per suggestion
   (`CONFIRM` / `REJECT` / `LATER`). Only a human decision produces
   `CONFIRMED_SAME_PERSON` / `NOT_SAME_PERSON`.
7. **Deletion follow-up** — findings can be linked to a data broker and a
   deletion request; the scheduler sets `next_check` so reappearances are noticed.
8. **Audit** — every mutation is written to `audit_log`, which also feeds the
   identity timeline. Audit entries never contain identifier values.

## Storage

| Volume | Mounted at | Content |
| --- | --- | --- |
| `postgres_data` | `/var/lib/postgresql/data` | Database |
| `evidence_data` | `/data/evidence` | Captured HTML, screenshots, hashes |
| `reports_data` | `/data/reports` | Tool reports imported by the API, Flowsint exports |
| `photos_data` | `/data/photos` | Your own avatars/photos |
| `metabase_data` | `/metabase-data` | Metabase internal files |
| bind `./data` | `/data/catalog` (read-only) | `sources.csv`, `data_brokers.csv` |

## OSINT runner protocol

The tool images share `osint/runner/runner.py` (standard library only):

- `GET /health` → `{"tool": "...", "status": "ok"}`
- `POST /run` with header `x-runner-token` → `{"target": "...", "options": {...}}`

The runner builds the command line from a per-tool **allow-list**, validates the
target against a strict regular expression, clamps numeric options, and executes
the binary with `shell=False`. It returns the collected report files (8 MB per
file, 64 KB per request body) and enforces `RUNNER_MAX_RUNTIME`.

## Frontend

React 18 + TypeScript + Vite, dark UI, desktop-first and usable on a tablet.
`src/api/*` is a thin typed client using a relative `/api` base, so the browser
never needs to know the API host: nginx proxies it (production) or the Vite dev
server proxies it (development). Routes mirror the pages listed in the README.

The interface is bilingual (English / French). `src/i18n/` holds a dependency-free
translation layer: dictionaries declare every message in both locales, `t()` only
accepts known keys, and the language switcher in the top bar persists the choice
in `localStorage`. See [frontend/README.md](frontend/README.md#internationalisation-french--english).

## External projects (opt-in)

- **Flowsint** keeps its own datastore, as documented upstream. Integration is
  through file exports read from `FLOWSINT_EXPORT_DIR`; PostgreSQL stays the
  source of truth. See `flowsint/README.md`.
- **OpenOSINT** is never started automatically. Point `OPENOSINT_URL` at your own
  instance after reviewing its licence and terms. See `openosint/README.md`.
