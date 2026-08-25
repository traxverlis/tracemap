# REST API

Base path: `/api`. Interactive documentation: `/api/docs` (OpenAPI at
`/api/openapi.json`).

## Authentication

All endpoints except `/api/health`, `/api/auth/bootstrap-status`,
`/api/auth/bootstrap` and `/api/auth/login` require a bearer token obtained from
`POST /api/auth/login`. Missing or invalid credentials return `401`.

## Conventions

- JSON in, JSON out; `PATCH` bodies are partial.
- Timestamps are ISO-8601 UTC.
- `404` unknown resource, `409` conflict (duplicate identifier, AI disabled),
  `403` missing authorisation acknowledgement, `422` validation error.

## Endpoints

### Health and authentication

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health` | Liveness probe (status and application version) |
| GET | `/auth/bootstrap-status` | Whether the first account still has to be created |
| POST | `/auth/bootstrap` | Create the first local administrator |
| POST | `/auth/login` | Obtain an access token |
| GET | `/auth/me` | Current user |
| POST | `/auth/password` | Change the current password |

### Identity and inventory

| Method | Path | Purpose |
| --- | --- | --- |
| GET/POST | `/identities` | List / create identities |
| GET/PATCH/DELETE | `/identities/{id}` | Read / update / delete an identity |
| POST | `/identities/{id}/authorization` | Record the authorisation acknowledgement |
| GET | `/identities/{id}/completeness` | Explainable completeness score |
| PUT | `/identities/{id}/completeness-targets` | Declare per-category expectations |
| GET/POST | `/identifiers` | List (filters: `identity_id`, `type`, `q`) / create |
| GET/PATCH/DELETE | `/identifiers/{id}` | Read / update / delete |
| GET/POST | `/companies` | Professional history |
| PATCH/DELETE | `/companies/{id}` | Update / delete |
| GET/POST | `/domains`, `/profiles` | Domains and declared profiles |
| PATCH/DELETE | `/domains/{id}`, `/profiles/{id}` | Update / delete |
| GET/POST | `/photos` | List / upload (multipart) your own photos |
| DELETE | `/photos/{id}` | Delete a photo and its file |

Identifiers are normalised on write; a duplicate `(identity, type, normalised
value)` returns `409`.

### Discovery

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/scans/tools` | Tools with their availability and required settings |
| GET/POST | `/scans` | List / queue a scan (`403` without authorisation) |
| GET | `/scans/{id}` | Scan detail |
| GET | `/scans/{id}/results` | Raw results |
| POST | `/scans/{id}/promote` | Promote chosen results into accounts/findings |
| POST | `/scans/{id}/cancel` | Cancel a pending or running scan |
| GET | `/accounts` | Discovered accounts (filters: `identity_id`, `status`, `q`) |
| PATCH | `/accounts/{id}` | Update an account (status, confidence…) |
| GET/POST | `/findings` | Findings |
| PATCH/DELETE | `/findings/{id}` | Update / delete |
| GET/POST | `/findings/{id}/evidence` | Evidence attached to a finding |
| GET | `/evidence` | All evidence (filter: `identity_id`) |

### Correlation and graph

| Method | Path | Purpose |
| --- | --- | --- |
| GET/POST | `/relationships` | List / create relationships |
| DELETE | `/relationships/{id}` | Delete a relationship |
| GET | `/relationships/review` | Human validation queue |
| POST | `/relationships/{id}/decision` | `CONFIRM` / `REJECT` / `LATER` |
| GET | `/relationships/graph` | Nodes and edges for the identity graph |
| POST | `/correlation/run` | Recompute suggestions for an identity |
| GET | `/correlation/rules` | Weights, method and bands |

### Privacy operations

| Method | Path | Purpose |
| --- | --- | --- |
| GET/POST | `/data-brokers` | Broker catalogue |
| PATCH/DELETE | `/data-brokers/{id}` | Update / delete |
| POST | `/data-brokers/import` | Import `data/data_brokers.csv` (idempotent) |
| GET/POST | `/deletion-requests` | Deletion / opt-out follow-up |
| PATCH/DELETE | `/deletion-requests/{id}` | Update (status changes are audited) / delete |

### Overview

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/dashboard/summary?identity_id=` | All dashboard counters + completeness |
| GET | `/timeline?identity_id=&limit=` | Identity timeline, derived from the audit log |

### Assistant

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/ai/status` | Provider, model, capabilities |
| POST | `/ai/suggest` | Run a task (`409` when the assistant is disabled) |
| GET | `/ai/suggestions` | Stored suggestions |
| POST | `/ai/suggestions/{id}/decision` | Accept or reject a suggestion |

### Settings, export, erasure

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/settings` | Effective configuration (never returns secrets) |
| GET | `/settings/export?identity_id=` | Full JSON export (one identity or all) |
| POST | `/settings/erase` | Irreversible erasure, requires `{"confirm": "ERASE"}` |
