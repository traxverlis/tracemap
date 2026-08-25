# Database

PostgreSQL 16 is the **single source of truth**. Every other component (OSINT
tools, Flowsint, Metabase) is either a producer of raw results or a read-only
consumer.

Portability note: primary keys are UUID strings (`VARCHAR(36)`), JSON columns use
SQLAlchemy's generic `JSON` type and enumerations are stored as text with a Python
`StrEnum` in front. The exact same models therefore run on PostgreSQL in
production and on SQLite in the test suite.

## Migrations

Alembic owns the schema. The `backend` container runs `alembic upgrade head`
before starting uvicorn.

```bash
docker compose exec backend alembic current
docker compose exec backend alembic upgrade head
docker compose exec backend alembic downgrade -1
docker compose exec backend alembic revision --autogenerate -m "describe change"
```

`backend/alembic/versions/0001_initial_schema.py` creates the whole schema.

## Tables

### Core inventory

**identity** — one row per audited person.
`id, label, description, first_name, last_name, birth_date, country, attributes,
authorization_ack, authorization_ack_at, created_at, updated_at`
`attributes` holds the free-form extras (name variants, known aliases, cities
lived in, notes). `authorization_ack` gates every scan.

**identifiers** — emails, phones, usernames, names, addresses, domains.
`id, identity_id, type, value, normalized_value, subtype, label, is_active,
confidence, valid_from, valid_to, first_seen, last_seen, source_id, notes,
attributes, created_at, updated_at`
`value` keeps the original input, `normalized_value` the canonical form. A unique
constraint on `(identity_id, type, normalized_value)` makes the API answer `409`
on duplicates.

**companies** — professional history.
`id, identity_id, name, position, website, professional_profile_url,
professional_domain, valid_from, valid_to, is_former, notes, …`

**domains** — personal domains and sites.
`id, identity_id, domain, known_owner, registrar, status, valid_from, valid_to,
notes, attributes, …`

**profiles** — profiles you declare yourself (GitHub, GitLab, LinkedIn, forums…).
`id, identity_id, platform, username, url, is_active, is_public, notes, source_id, …`

**photos** — your own avatars/photos.
`id, identity_id, filename, storage_path, sha256, perceptual_hash, content_type,
size_bytes, platform, source, notes, …`

**sources** — where a piece of information came from.
`id, name, type, url, reliability, notes, …`

**completeness_targets** — per-category expectation used by the score.
`id, identity_id, category, expected_count, …`

### Discovery

**scans** — the work queue.
`id, identity_id, scan_type, target, tool, status, started_at, finished_at,
scheduled_for, error, parameters_json, created_at, updated_at`
Status: `PENDING → RUNNING → COMPLETED | FAILED | CANCELLED`.

**scan_results** — raw output, kept untouched for traceability.
`id, scan_id, result_type, value, url, confidence, raw_result_json, created_at`

**accounts** — accounts attributed (or not yet) to the identity.
`id, identity_id, platform, username, email, url, status, confidence, source,
first_seen, last_seen, attributes, …`
Status: `NEW | SUGGESTED | CONFIRMED | REJECTED | LATER | REAPPEARED`.

**findings** — anything discovered: an account, a data-broker record, a breach, a
mention, a document, a domain.
`id, identity_id, source, category, title, value, url, confidence, status,
broker_id, account_id, scan_id, discovered_at, last_verified_at, attributes, …`

**evidence** — proof attached to a finding.
`id, finding_id, source_url, captured_at, content_hash, screenshot_path,
html_path, metadata_json, …`

### Correlation

**relationships** — the identity graph, one row per edge.
`id, identity_id, source_entity_type, source_entity_id, target_entity_type,
target_entity_id, relationship_type, confidence, source, status, reason,
explanation_json, decided_by, decided_at, …`
`explanation_json` stores the score, the band, the method and every rule that
fired, so a suggestion can always be justified. `decided_by` / `decided_at`
record the human decision.

Relationship types: `OWNS, USED, LINKED_TO, FOUND_ON, MENTIONED_ON,
ASSOCIATED_WITH, POSSIBLY_SAME_PERSON, CONFIRMED_SAME_PERSON, NOT_SAME_PERSON`.
Statuses: `UNKNOWN, SUGGESTED, CONFIRMED, REJECTED`.

### Privacy operations

**data_brokers** — the catalogue you curate yourself.
`id, name, domain, country, category, search_url, optout_url, optout_method,
requires_email, requires_phone, requires_identity_document, automation_possible,
notes, last_checked, …`
Opt-out URLs must come from the broker's own documentation — never invent one.

**deletion_requests** — removal follow-up.
`id, identity_id, finding_id, broker_id, status, method, requested_at,
confirmation, confirmation_url, verified_at, next_check, notes, …`
Status: `TODO | REQUESTED | IN_PROGRESS | CONFIRMED | REFUSED | REAPPEARED`.
`next_check` drives the periodic reappearance verification.

### Governance

**users** — local accounts.
`id, email, display_name, password_hash, is_active, is_admin, auth_provider,
external_subject, last_login_at, …`
`auth_provider` / `external_subject` are already there for a future OIDC/OAuth2
provider.

**ai_suggestions** — every LLM proposal, always pending human validation.
`id, type, source_entity, target_entity, prompt_context_hash, provider, model,
suggestion, rationale, confidence, status, created_at, validated_at, validated_by,
payload_json`
Only the hash of the minimised context is kept — never the prompt.

**audit_log** — the trace of every mutation, and the source of the timeline.
`id, user_id, action, entity_type, entity_id, timestamp, metadata_json`
Identifier values are never written here.

## Roles

`postgres/init/03-readonly-role.sql` creates a read-only role for analysis tools.
Point Metabase at it (or at least review its permissions) rather than reusing the
application owner.

## Conventions

- Timestamps are timezone-aware UTC.
- `created_at` / `updated_at` are maintained by the ORM on every table that has them.
- Deleting an identity cascades to its inventory, findings, evidence, scans and
  relationships — that is what `POST /api/settings/erase` relies on.
