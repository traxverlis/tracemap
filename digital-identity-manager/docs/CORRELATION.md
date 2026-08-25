# Correlation

The correlation engine answers one question: *do these two entities belong to the
same person?* It must be **explainable**, and it must never decide on its own.

Implementation: `backend/app/correlation/` — `rules.py` (weights),
`features.py` (feature extraction), `engine.py` (scoring and persistence).

## Signals and weights

| Rule | Weight | Meaning |
| --- | ---: | --- |
| `same_email` | +100 | Same normalised email address |
| `same_phone` | +100 | Same phone number in E.164 form |
| `explicit_link` | +90 | One profile explicitly links to the other |
| `same_username` | +70 | Identical normalised username on two platforms |
| `same_domain` | +60 | Same personal domain or website |
| `same_avatar` | +50 | Identical SHA-256, or very close perceptual hash |
| `same_name` | +40 | Identical normalised display name |
| `similar_username` | +25 | Usernames differ only by digits, separators or a short suffix |
| `same_company` | +25 | Same employer or professional domain |
| `similar_bio` | +20 | Biographies share rare tokens |
| `same_city` | +15 | Same declared city |
| `conflicting_country` | −25 | Mutually exclusive declared countries |
| `conflicting_timeline` | −20 | Activity periods that cannot overlap |

## Method

Positive signals are combined with a **noisy-OR**:

```
score = 1 − Π (1 − weight_i / 100)
```

This keeps the strongest signal dominant while letting several weak, independent
signals reinforce each other — and it never overflows past 100, unlike a plain
sum. Penalties are then subtracted linearly, and the result is clamped to
`[0, CORRELATION_AUTO_MAX_SCORE]` (default **95**).

The cap is a design decision, not a tuning artefact: **an automatic score never
means certainty**. Only a human decision moves a relationship to `CONFIRMED`
(`CONFIRMED_SAME_PERSON`) or `REJECTED` (`NOT_SAME_PERSON`).

## Bands

| Score | Band |
| --- | --- |
| ≥ 90 | very strong match |
| ≥ 70 | strong match |
| ≥ 40 | possible match |
| > 0 | weak signal |
| 0 | no signal |

Relationships are only suggested above `CORRELATION_SUGGEST_THRESHOLD`
(default 40).

## Worked example

Account X and account Y share the username, the email and the personal site:

```
same_username  +70   → 1 − 0.30 = 0.70
same_email    +100   → combined  = 1 − (0.30 × 0.00) = 1.00
same_domain    +60   → combined  = 1.00
raw score            = 100
cap                  = 95
```

Stored result:

```json
{
  "score": 95,
  "band": "very strong match",
  "method": "noisy-OR over positive signals, linear penalties, capped at 95",
  "components": [
    {"rule": "same_username", "label": "Same exact username", "weight": 70, "detail": "jdoe"},
    {"rule": "same_email",    "label": "Same email address",  "weight": 100},
    {"rule": "same_domain",   "label": "Same personal domain","weight": 60, "detail": "example.com"}
  ]
}
```

with the reason *"Very strong match: Same exact username, Same email address,
Same personal domain"*.

## Persistence

`run_correlation()` upserts one `relationships` row per pair:

- new pair above the threshold → `POSSIBLY_SAME_PERSON`, status `SUGGESTED`;
- an existing `CONFIRMED` or `REJECTED` row is **never overwritten** — a human
  decision always wins over a recomputation;
- `explanation_json` always contains the score, the band, the method and every
  component, so the suggestion can be justified months later.

## Human validation

`GET /api/relationships/review` builds the review queue: for each suggestion it
returns the question ("Is this GitHub account yours?"), the two labels, the
platform, the username, the URL, the context and the score.

`POST /api/relationships/{id}/decision` accepts `CONFIRM`, `REJECT` or `LATER`
with an optional reason, and records who decided and when (`decided_by`,
`decided_at`) plus an audit entry with the previous and the new status.

## Tuning

Weights live in one place (`rules.py`) and are exposed read-only by
`GET /api/correlation/rules`, so the dashboard can display the exact method used.
If you change a weight, document why: past relationships keep the explanation
that was computed at the time.
