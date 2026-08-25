# Completeness score

## What it measures — and what it does not

The completeness score measures **how complete your research inventory is**.

It does **not** measure how much personal data you have exposed online. Adding an
email address you had forgotten raises the score, because the audit is now more
complete — not because you became more exposed.

Implementation: `backend/app/services/completeness.py`, exposed by
`GET /api/identities/{id}/completeness` and shown on `/dashboard`.

## Categories and weights

| Category | Label | Weight | Default expectation |
| --- | --- | ---: | ---: |
| `general` | General information | 1.0 | 1 |
| `email` | Known emails | 2.0 | 2 |
| `phone` | Known phone numbers | 1.5 | 1 |
| `username` | Known usernames | 2.0 | 3 |
| `name` | Name variants / former identities | 1.0 | 1 |
| `address` | Former addresses | 1.0 | 1 |
| `professional` | Professional history | 1.0 | 1 |
| `domain` | Domains / personal sites | 1.0 | 1 |
| `profile` | Known profiles | 1.5 | 3 |
| `photo` | Photos / avatars | 0.5 | 1 |

`general` counts as complete as soon as one of first name, last name, birth date,
country, name variants or cities is filled in.

## Formula

For each category:

```
ratio = min(known / expected, 1)
```

then

```
score = round( Σ (ratio × weight) / Σ weight × 100 )
```

A category whose expectation is set to `0` is treated as "not applicable" and
contributes a full ratio, so you are not penalised for something that does not
exist in your life.

## Your own expectations

You know how many emails or usernames you have had. Set the expectation per
category with `PUT /api/identities/{id}/completeness-targets` (or the dashboard),
and the score compares reality with **your** declaration, not with an arbitrary
number.

## Explainability

The response always contains:

```json
{
  "score": 72,
  "explanation": "Inventory coverage of your own research material. Still incomplete: Known usernames (3/5); Former addresses (2/4). This score does not measure how exposed you are.",
  "categories": [
    {"category": "email", "label": "Known emails", "known": 4, "expected": 4, "ratio": 1.0, "weight": 2.0, "missing": 0},
    {"category": "username", "label": "Known usernames", "known": 3, "expected": 5, "ratio": 0.6, "weight": 2.0, "missing": 2}
  ]
}
```

which the dashboard renders as the familiar table:

```
Known emails         4/4
Known usernames      3/5
Phone numbers        2/2
Former addresses     2/4
Known profiles       5/7
```

Every missing category is named explicitly, so the score always tells you what to
do next.
