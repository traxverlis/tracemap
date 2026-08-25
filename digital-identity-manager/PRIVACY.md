# Privacy

The whole point of this lab is to *reduce* your exposure, so the tool itself must
not become a new exposure. Two principles drive the design: **local by default**
and **data minimisation**.

## Legal basis and scope

Only your own identity — or an identity you have an explicit authorisation to
audit — may be entered. The authorisation acknowledgement is recorded per identity
and required before any scan. All processing happens on your machine; nothing is
sent anywhere unless you explicitly enable an outbound feature.

Sources are consulted in the way they publish their data, within their terms of
use. The application never tries to reach private data or protected accounts.

## What leaves the machine

| Feature | Default | What is sent |
| --- | --- | --- |
| Maigret / Sherlock / Holehe | on (containers) | The username or email you asked to scan, to public sites, from the `osint` network. |
| WhatsMyName dataset | off (`ALLOW_OUTBOUND_HTTP`) | A dataset download from GitHub; usernames are then tested according to your configuration. |
| WHOIS / DNS / TLS | off (`ALLOW_OUTBOUND_HTTP`) | The domain you asked about. |
| Have I Been Pwned | off (needs `HIBP_API_KEY`) | The email address you asked about (HIBP terms apply). |
| LLM assistant | off (`LLM_PROVIDER=disabled`) | A minimised, hashed-and-logged context (see below). |
| Metabase | local only | Nothing leaves the host. |

Nothing else performs network calls. With the default `.env`, only the three OSINT
tool containers talk to the Internet, and only when you start a scan.

## Data minimisation before an LLM call

Implemented in `backend/app/llm/minimization.py` and applied to **every** payload
before it reaches a provider:

1. **Selection** — only the fields the task needs are collected; the database is
   never dumped into a prompt.
2. **Reduction** — emails are masked (`j******e@example.com`) unless
   `LLM_ALLOW_FULL_EMAILS=true`; phone numbers are masked or removed unless
   `LLM_ALLOW_PHONE_NUMBERS=true`; **addresses, birth dates and postal data are
   dropped entirely** unless `LLM_ALLOW_ADDRESSES=true`.
3. **Deletion** — keys such as `password`, `password_hash`, `secret`, `token`,
   `api_key`, `authorization`, `cookie`, `private_key`, `hibp_api_key`,
   `llm_api_key`, `osint_runner_token` are replaced by `[REDACTED]`; free text is
   scanned for common secret shapes (bearer tokens, `sk-…`, `ghp_…`, `xox…`, JWT)
   and redacted too.
4. **Truncation** — strings are capped (500 characters) and lists are capped
   (50 items) so an accidental bulk export cannot happen.
5. **Opt-out** — `LLM_PROVIDER=disabled` (the default) makes the AI endpoints
   return `409` and no provider is instantiated.
6. **Journalising** — only `prompt_context_hash` (SHA-256 of the minimised
   context) is stored on the suggestion and written to the audit log. The prompt
   itself is never persisted.

### What the assistant may and may not do

It may: summarise findings, propose correlations, point at missing inventory
categories, suggest next searches, classify results, explain a score.

It may never: invent an identity, turn a hypothesis into a fact, modify confirmed
data, send a deletion request, or delete anything. Every output is stored in
`ai_suggestions` with status `SUGGESTED` and requires a human decision.

## Sensitive categories

- **Addresses** are treated as highly sensitive: excluded from LLM payloads by
  default, and never included in audit metadata.
- **Phone numbers** are normalised to E.164 for matching but masked in logs and
  in any external payload.
- **Photos** are stored locally with a SHA-256 (and an optional perceptual hash)
  so an identical avatar can be spotted. There is no facial recognition, and the
  feature is meant for your own images only.
- **Evidence** files may contain personal data by nature; they live in a Docker
  volume and are git-ignored.

## Logging

The audit log records *what changed* (action, entity type, entity id, user, time)
and never the value of an identifier. Application logs follow the same rule.

## Retention, portability and erasure

- `GET /api/settings/export` returns a complete JSON export (one identity, or all
  of them) — GDPR articles 15 and 20.
- `POST /api/settings/erase` with `confirm: "ERASE"` deletes an identity and every
  related row, or the whole dataset — GDPR article 17. The action is irreversible
  and is itself audited.
- Backups produced by `scripts/backup.sh` contain the same personal data: store
  them encrypted and delete them when you no longer need them.
- Keep only what serves the audit. Delete findings and evidence once a removal is
  confirmed and the reappearance checks are over.

## Data brokers

`data/data_brokers.csv` ships **with headers only**. Opt-out URLs are never
invented or guessed: add an entry only after checking the broker's own privacy
page, and record the method it documents. A wrong opt-out URL would send your
personal data to an unknown third party.
