# Maigret container

[Maigret](https://github.com/soxoj/maigret) (MIT) searches a username across many
public sites. It runs in its own image, on the `osint` network, behind
`osint/runner/runner.py`.

- Image: `python:3.12-slim`, non-root, `maigret==0.6.4` from PyPI.
- Entry point: the shared runner (`RUNNER_TOOL=maigret`), authenticated with
  `OSINT_RUNNER_TOKEN`.
- Command built by the runner:
  `maigret <username> --json simple --folderoutput <dir> --timeout N --top-sites N [--tags TAG …]`
- Options accepted from the API: `timeout` (5-120 s), `top_sites` (10-3000),
  `tags` (lowercase, `[a-z0-9-]`).

`reports/` is bind-mounted into the container and keeps the raw reports. It is
git-ignored: reports contain personal data.

Only scan usernames that are yours. Maigret never bypasses authentication or
anti-bot protections, and neither does this integration.
