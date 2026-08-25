# Flowsint integration

[Flowsint](https://github.com/reconurge/flowsint) (Apache-2.0) is an
investigation graph platform. It is **not** started by this compose stack, and
this project deliberately does not try to share its database.

## Why the separation

Flowsint keeps its own datastores, as documented upstream. Pointing it at the
Digital Identity Manager schema would break both projects on the next upgrade of
either side. Here, **PostgreSQL remains the single source of truth** for the
inventory, and Flowsint is used — if you want it — as a visualisation and
investigation companion.

## How to use it

1. Run Flowsint separately, following its official documentation and licence.
2. Export the graph you produced there (JSON).
3. Drop the export in the directory pointed at by `FLOWSINT_EXPORT_DIR`
   (default `/data/reports/flowsint` in the backend container, i.e. the
   `reports_data` volume).
4. Start a `flowsint` scan from `/scans`, or import the file with the CLI. The
   connector reads the export, turns each node/edge into a scan result, and you
   promote the ones you recognise.

Nothing is imported automatically and nothing is pushed back to Flowsint.

## Notes

- Only export data about **your own** identity.
- The export may contain personal data: treat the file like a backup
  (see PRIVACY.md).
- This directory holds no code; it exists so exports and notes have an obvious
  home.
