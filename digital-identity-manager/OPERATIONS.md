# Operations

Everyday runbook. All commands are run from `digital-identity-manager/`.

## Start / stop

```bash
docker compose up -d --build        # production-like stack
docker compose ps
docker compose logs -f backend
docker compose down                 # keep the volumes
docker compose down -v              # DESTROY the data too
```

Development stack (hot reload; ports bound to `127.0.0.1`):

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

| URL | Service |
| --- | --- |
| <http://localhost:8080> | Dashboard (nginx + SPA, `/api` proxied to the backend) |
| <http://localhost:8080/api/docs> | OpenAPI documentation |
| <http://localhost:3000> | Metabase |

## First run

1. `cp .env.example .env`, then fill `SECRET_KEY`, `OSINT_RUNNER_TOKEN` and
   `POSTGRES_PASSWORD` (`openssl rand -hex 32`).
2. `docker compose up -d --build`.
3. Open the dashboard: it asks you to create the local administrator account.
4. Create an identity, then tick the **authorisation acknowledgement** on
   `/identity` — scans are refused until you do.
5. Fill the inventory with the wizard (`/identity/wizard`).

## Database

```bash
docker compose exec backend alembic current
docker compose exec backend alembic upgrade head
docker compose exec postgres psql -U "${POSTGRES_USER:-dim}" -d "${POSTGRES_DB:-dim}"
```

PostgreSQL has no host port on purpose. Use `docker compose exec`, or the dev
overlay which binds it to `127.0.0.1` only.

## Backup and restore

```bash
scripts/backup.sh                 # -> ./backups/dim-<timestamp>.dump + files archive
scripts/restore.sh backups/dim-20260101T120000Z.dump [files-archive.tar.gz]
```

`backup.sh` dumps the database (custom format) and archives the evidence, reports
and photos volumes. **The output contains highly sensitive personal data**: keep
it on an encrypted volume, restrict permissions (the script already uses `700`/`600`)
and delete it when it is no longer needed. `restore.sh` asks for an explicit
`RESTORE` confirmation before overwriting.

## Running a scan

From the dashboard (`/scans`): choose the tool, the target and the options, then
start it. A worker picks the job up within `WORKER_POLL_SECONDS`.

Results land in `scan_results`. Review them and **promote** the ones you
recognise into accounts/findings — nothing is promoted automatically.

Available tools depend on the configuration: a tool whose runner URL is empty, or
a feature requiring `ALLOW_OUTBOUND_HTTP` / `HIBP_API_KEY`, is reported as
disabled by `GET /api/scans/tools`.

## Importing reports produced outside the app

If you ran a tool by hand, import its report:

```bash
python scripts/import_maigret.py  --username jdoe  --database-url "$DATABASE_URL" maigret/reports/*.json
python scripts/import_sherlock.py --username jdoe  --database-url "$DATABASE_URL" sherlock/reports/*.csv
python scripts/import_holehe.py   --email you@example.com --database-url "$DATABASE_URL" holehe/reports/*.csv
python scripts/import_openosint.py --identity-id <uuid> --database-url "$DATABASE_URL" reports/openosint/*.json
```

Each importer creates a `scans` row (marked as imported) plus its `scan_results`,
so imported data follows exactly the same promotion and audit path.

## Maintenance scripts

```bash
python scripts/normalize.py --database-url "$DATABASE_URL"           # dry run
python scripts/normalize.py --database-url "$DATABASE_URL" --apply   # rewrite normalised values
python scripts/correlate.py --identity-id <uuid> --database-url "$DATABASE_URL"
```

`normalize.py` never modifies the value you typed, only its normalised form.
`correlate.py` is the CLI equivalent of `POST /api/correlation/run`.

## Data-broker catalogue

`data/data_brokers.csv` ships empty on purpose. Add the brokers that concern you,
with an opt-out URL taken from the broker's own privacy page, then:

```
POST /api/data-brokers/import        # or the "Import catalogue" button
```

Rows already present (matched on the domain) are skipped, so the import is
idempotent.

## Deletion follow-up

1. Create a deletion request from a finding (`/deletions`).
2. Send the request yourself, through the broker's documented channel. The
   application never sends anything on your behalf.
3. Record the confirmation and the confirmation URL.
4. The scheduler sets `next_check` (`RECHECK_INTERVAL_DAYS`, default 30) and
   queues a re-check; if the data is found again the request moves to
   `REAPPEARED` and appears on the dashboard.

## Export and erasure

```bash
curl -H "Authorization: Bearer $TOKEN" \
     "http://localhost:8080/api/settings/export?identity_id=<uuid>" -o export.json
```

Erasure is available from `/settings` and requires typing `ERASE`. It is
irreversible.

## Backend development without Docker

```bash
cd backend
python -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
export SECRET_KEY=$(openssl rand -hex 32) DATABASE_URL=sqlite:///./dev.db
alembic upgrade head
uvicorn app.main:app --reload
pytest -q          # 49 tests
ruff check app tests
```

Frontend:

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173, /api proxied to VITE_API_BASE
npm run build
```

## Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| `SECRET_KEY is required` at start-up | Fill `.env`; the development placeholder is refused when `ENVIRONMENT=production`. |
| `403 authorization acknowledgement required` | Tick the authorisation on `/identity` for that identity. |
| A tool is greyed out on `/scans` | Its runner URL is empty, or the feature needs `ALLOW_OUTBOUND_HTTP=true` / `HIBP_API_KEY`. |
| Scans stay `PENDING` | `WORKERS_ENABLED=false`, or the backend container is unhealthy — check `docker compose logs backend`. |
| `401` from a runner | `OSINT_RUNNER_TOKEN` differs between the backend and the tool container; restart both after changing `.env`. |
| Metabase cannot connect | Its database is created by `postgres/init/02-metabase-db.sh`, which only runs on a **fresh** volume. Create `metabase` manually or recreate the volume. |
| AI endpoints return `409` | `LLM_PROVIDER=disabled` — that is the default, and the rest of the application works without it. |
