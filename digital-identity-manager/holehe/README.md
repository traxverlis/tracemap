# Holehe container

[Holehe](https://github.com/megadose/holehe) (GPL-3.0) checks, for a given email
address, which sites have an account registered with it, using the sites' own
public password-recovery behaviour. It never logs in anywhere.

- Image: `python:3.12-slim`, non-root, `holehe==1.61` from PyPI, used as an
  unmodified CLI.
- Entry point: the shared runner (`RUNNER_TOOL=holehe`), authenticated with
  `OSINT_RUNNER_TOKEN`.
- Command built by the runner:
  `holehe <email> --csv --no-color --no-clear [--only-used] [-NP] --timeout N`
- Options accepted from the API: `timeout` (5-60 s), `only_used` (default true),
  `no_password_recovery`.
- CSV columns: `name,domain,rateLimit,exists,emailrecovery,phoneNumber,others`.

`reports/` is bind-mounted and git-ignored: reports contain personal data.

Only check email addresses that are yours. Some sites rate-limit these checks;
respect their terms of use.
