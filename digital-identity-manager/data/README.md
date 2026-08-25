# Reference data

## `data_brokers.csv`

Catalogue of data brokers / people-search sites, imported with
`POST /api/data-brokers/import-catalog`.

**The file ships empty on purpose.** An opt-out URL must never be guessed: a
wrong URL sends personal data to the wrong recipient. Add only entries you have
verified yourself on the broker's own site, then re-run the import.

Columns:

| Column | Meaning |
| --- | --- |
| `name` | Broker name (required) |
| `domain` | Main domain |
| `country` | Country / jurisdiction |
| `category` | e.g. `people-search`, `marketing`, `credit` |
| `search_url` | Page where your record can be looked up |
| `optout_url` | **Verified** opt-out page |
| `optout_method` | `form`, `email`, `postal`, `account`, ... |
| `requires_email` / `requires_phone` / `requires_identity_document` | `true`/`false` |
| `automation_possible` | `true` only if the broker's terms allow it |
| `notes` | Free text |

## `sources.csv`

Provenance of every tool / dataset / API the project can use, with its upstream
URL and whether an API key is required.
