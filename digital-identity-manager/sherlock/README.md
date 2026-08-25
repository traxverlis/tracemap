# Sherlock container

[Sherlock](https://github.com/sherlock-project/sherlock) (MIT) searches a username
across social networks. It runs in its own image, on the `osint` network, behind
`osint/runner/runner.py`.

- Image: `python:3.12-slim`, non-root, `sherlock-project==0.16.0` from PyPI.
- Entry point: the shared runner (`RUNNER_TOOL=sherlock`), authenticated with
  `OSINT_RUNNER_TOKEN`.
- Command built by the runner:
  `sherlock <username> --csv --folderoutput <dir> --print-found --timeout N [--site NAME …] [--nsfw]`
- Options accepted from the API: `timeout` (5-120 s), `sites`, `nsfw`.

Recent Sherlock releases have no JSON output (`--json` designates an *input* site
database), so the CSV report is parsed instead.

`reports/` is bind-mounted and git-ignored: reports contain personal data.

Only scan usernames that are yours.
