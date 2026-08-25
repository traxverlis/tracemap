# Security

## Intended use

Digital Identity Manager is a **private lab**. It is designed to be run on a
machine you control, for identities you own or are explicitly authorised to
audit. It is not a multi-tenant service and must not be exposed on the public
Internet as-is.

## Explicitly out of scope (by design)

The application contains no code to:

- bypass authentication, a CAPTCHA or an anti-bot protection;
- access an account, a mailbox or a private profile that is not yours;
- circumvent an access control or rate limit;
- perform mass facial recognition or identify third parties.

Photo support is limited to hashing *your own* images so an identical avatar can
be recognised across platforms. Requests to add bypass features will not be
implemented.

## Authorisation gate

`identity.authorization_ack` (with `authorization_ack_at`) records that the
operator confirmed they own — or are authorised to audit — the identity.
`POST /api/scans` raises `403 AuthorizationRequired` while it is false. The flag
is also surfaced on `/identity` in the dashboard.

## Network isolation

- `backend` is a Docker **internal** network: PostgreSQL, the API and Metabase
  have no route to the Internet through it.
- PostgreSQL is **never published** on the host in `docker-compose.yml`. The
  development overlay may bind it, but only to `127.0.0.1`.
- Only `frontend` (8080) and Metabase (3000) publish ports.
- The API is additionally attached to `osint` so it can reach the tool runners.
  Direct outbound HTTP from the API is still disabled unless
  `ALLOW_OUTBOUND_HTTP=true`.

## Authentication

- Local accounts only, bootstrapped on first run (`GET /api/auth/bootstrap-status`,
  `POST /api/auth/bootstrap`). Bootstrap is refused once a user exists.
- Passwords are hashed with **Argon2id** (`argon2-cffi`), never stored or logged
  in clear text; a minimum length policy is enforced and hashes are transparently
  re-hashed when parameters change.
- Sessions are short-lived JWT access tokens signed with `SECRET_KEY`
  (`access_token_ttl_minutes`). Unauthenticated calls return `401`.
- The `users` table already carries `auth_provider` and `external_subject`, and
  token issuing is isolated in `create_access_token`, so OIDC/OAuth2 can be added
  later without touching the rest of the API.

## Secrets

- `SECRET_KEY` and `OSINT_RUNNER_TOKEN` are **required**; the application refuses
  to start in `ENVIRONMENT=production` with the development placeholder key.
- Secrets come from the environment (`.env`, git-ignored). No secret is committed,
  and `GET /api/settings` never returns key material — only booleans such as
  "an LLM key is configured".
- API keys, tokens and password hashes are excluded from every LLM payload
  (see [PRIVACY.md](PRIVACY.md)).

## OSINT runner hardening

`osint/runner/runner.py` is deliberately small and dependency-free:

- authentication with the shared `x-runner-token` header (constant-time compare,
  failing closed when no token is configured);
- the target must match a strict regular expression (username, email or domain
  shape depending on the tool);
- command lines are built from a per-tool **allow-list** of options, numeric
  values are clamped, and the process is spawned with `shell=False` — no user
  input ever reaches a shell;
- request bodies are capped (64 KB), report files are capped (8 MB each);
- `RUNNER_MAX_RUNTIME` kills runaway processes;
- containers run as a non-root user.

## Web hardening

- The API sets `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
  `Referrer-Policy: no-referrer` and `Cache-Control: no-store` on every response.
- nginx repeats those headers for the SPA and adds `X-Robots-Tag: noindex` plus a
  restrictive `Content-Security-Policy`.
- CORS is restricted to `CORS_ORIGINS` (default: the local dashboard only).
- Uploads are limited to images, size-checked, stored outside the web root and
  served only through the API.

## Database hardening

- The application user owns the schema; `postgres/init/03-readonly-role.sql`
  creates a read-only role intended for Metabase and ad-hoc analysis.
- Migrations are applied with Alembic at container start.
- All queries go through SQLAlchemy with bound parameters.

## Logging

- Identifier values (emails, phone numbers, addresses) are **not** written to the
  audit log or to application logs; only entity types and identifiers of rows are.
- Phone numbers are never printed in full in logs.
- LLM calls log a `prompt_context_hash`, never the prompt content.

## Reporting a problem

This is a personal lab, not a hosted service. If you find a weakness, open an
issue in the repository (without including real personal data or evidence files).
