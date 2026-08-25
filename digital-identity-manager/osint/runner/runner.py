"""Minimal, dependency-free HTTP runner for a single OSINT tool.

Security model
--------------

* one container = one tool, chosen by ``RUNNER_TOOL``;
* the command line is **built here** from an allow-list of options: the caller
  can never inject arbitrary arguments and no shell is ever used;
* requests must carry the shared ``x-runner-token`` header;
* the container has no access to the ``backend`` network and no volume other
  than its own report directory;
* nothing in this runner bypasses authentication, CAPTCHAs or anti-bot
  protections: it merely executes the upstream CLI with public parameters.

Protocol
--------

``GET  /health`` -> ``{"status": "ok", "tool": "maigret"}``
``POST /run``    -> ``{"target": "...", "options": {...}}``
                 <- ``{"exit_code": 0, "stdout": "", "stderr": "",
                       "files": [{"name": "...", "content": "..."}]}``
"""

from __future__ import annotations

import json
import logging
import os
import re
import shutil
import subprocess  # noqa: S404 - fixed argument vectors, shell=False
import tempfile
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

LOG_FORMAT = "%(asctime)s %(levelname)s runner %(message)s"
logging.basicConfig(level=logging.INFO, format=LOG_FORMAT)
logger = logging.getLogger("runner")

TOOL = os.environ.get("RUNNER_TOOL", "").strip().lower()
TOKEN = os.environ.get("RUNNER_TOKEN", "").strip()
PORT = int(os.environ.get("RUNNER_PORT", "8080"))
MAX_BODY_BYTES = 64 * 1024
MAX_FILE_BYTES = 8 * 1024 * 1024
MAX_RUNTIME_SECONDS = int(os.environ.get("RUNNER_MAX_RUNTIME", "1800"))

USERNAME_RE = re.compile(r"^[A-Za-z0-9._\-]{1,64}$")
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s.]+(\.[^@\s.]+)+$")
SITE_RE = re.compile(r"^[A-Za-z0-9 ._\-]{1,64}$")
TAG_RE = re.compile(r"^[a-z0-9\-]{1,32}$")

REPORT_SUFFIXES = (".json", ".ndjson", ".csv", ".txt", ".xlsx")


class BadRequest(ValueError):
    """Invalid payload sent by the backend."""


def _int_option(options: dict, key: str, default: int, minimum: int, maximum: int) -> int:
    try:
        value = int(options.get(key, default))
    except (TypeError, ValueError):
        return default
    return max(minimum, min(value, maximum))


def build_maigret(target: str, options: dict, output_dir: Path) -> list[str]:
    if not USERNAME_RE.match(target):
        raise BadRequest("invalid username")
    command = [
        "maigret",
        target,
        "--json",
        "simple",
        "--folderoutput",
        str(output_dir),
        "--timeout",
        str(_int_option(options, "timeout", 30, 5, 120)),
        "--top-sites",
        str(_int_option(options, "top_sites", 300, 10, 3000)),
    ]
    for tag in options.get("tags") or []:
        if isinstance(tag, str) and TAG_RE.match(tag):
            command += ["--tags", tag]
    return command


def build_sherlock(target: str, options: dict, output_dir: Path) -> list[str]:
    if not USERNAME_RE.match(target):
        raise BadRequest("invalid username")
    command = [
        "sherlock",
        target,
        "--csv",
        "--folderoutput",
        str(output_dir),
        "--print-found",
        "--timeout",
        str(_int_option(options, "timeout", 60, 5, 120)),
    ]
    for site in options.get("sites") or []:
        if isinstance(site, str) and SITE_RE.match(site):
            command += ["--site", site]
    if options.get("nsfw"):
        command.append("--nsfw")
    return command


def build_holehe(target: str, options: dict, output_dir: Path) -> list[str]:
    if not EMAIL_RE.match(target):
        raise BadRequest("invalid email address")
    command = ["holehe", target, "--csv", "--no-color", "--no-clear"]
    if options.get("only_used", True):
        command.append("--only-used")
    if options.get("no_password_recovery"):
        command.append("-NP")
    command += ["--timeout", str(_int_option(options, "timeout", 10, 5, 60))]
    return command


BUILDERS = {
    "maigret": build_maigret,
    "sherlock": build_sherlock,
    "holehe": build_holehe,
}


def collect_files(output_dir: Path) -> list[dict[str, str]]:
    files: list[dict[str, str]] = []
    for path in sorted(output_dir.rglob("*")):
        if not path.is_file() or path.suffix.lower() not in REPORT_SUFFIXES:
            continue
        try:
            if path.stat().st_size > MAX_FILE_BYTES:
                logger.warning("report too large, skipped name=%s", path.name)
                continue
            content = path.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue
        files.append({"name": path.name, "content": content})
    return files


def run_tool(target: str, options: dict) -> dict:
    builder = BUILDERS.get(TOOL)
    if builder is None:
        raise BadRequest(f"unsupported tool: {TOOL!r}")

    workdir = Path(tempfile.mkdtemp(prefix=f"{TOOL}-"))
    output_dir = workdir / "reports"
    output_dir.mkdir(parents=True, exist_ok=True)
    try:
        command = builder(target, options, output_dir)
        logger.info("run tool=%s args=%s", TOOL, len(command))
        completed = subprocess.run(  # noqa: S603 - fixed argv, shell disabled
            command,
            cwd=str(output_dir),
            capture_output=True,
            text=True,
            timeout=MAX_RUNTIME_SECONDS,
            check=False,
            shell=False,
        )
        return {
            "exit_code": completed.returncode,
            "stdout": completed.stdout[-20000:],
            "stderr": completed.stderr[-20000:],
            "files": collect_files(output_dir),
        }
    except subprocess.TimeoutExpired:
        return {
            "exit_code": 124,
            "stdout": "",
            "stderr": f"{TOOL} timed out after {MAX_RUNTIME_SECONDS}s",
            "files": collect_files(output_dir),
        }
    except FileNotFoundError as exc:
        return {"exit_code": 127, "stdout": "", "stderr": str(exc), "files": []}
    finally:
        shutil.rmtree(workdir, ignore_errors=True)


class Handler(BaseHTTPRequestHandler):
    server_version = "osint-runner/1.0"

    def log_message(self, fmt: str, *args) -> None:  # noqa: A003 - stdlib hook
        logger.info("%s %s", self.command, self.path)

    def _send(self, status: int, payload: dict) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("content-type", "application/json")
        self.send_header("content-length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _authorized(self) -> bool:
        if not TOKEN:
            return True
        return self.headers.get("x-runner-token", "") == TOKEN

    def do_GET(self) -> None:  # noqa: N802 - stdlib hook
        if self.path.rstrip("/") == "/health":
            self._send(200, {"status": "ok", "tool": TOOL})
            return
        self._send(404, {"detail": "not found"})

    def do_POST(self) -> None:  # noqa: N802 - stdlib hook
        if self.path.rstrip("/") != "/run":
            self._send(404, {"detail": "not found"})
            return
        if not self._authorized():
            self._send(401, {"detail": "invalid runner token"})
            return

        try:
            length = int(self.headers.get("content-length", "0"))
        except ValueError:
            self._send(400, {"detail": "invalid content-length"})
            return
        if length <= 0 or length > MAX_BODY_BYTES:
            self._send(413, {"detail": "payload too large"})
            return

        try:
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
            if not isinstance(payload, dict):
                raise BadRequest("payload must be an object")
            target = str(payload.get("target", "")).strip()
            options = payload.get("options") or {}
            if not isinstance(options, dict):
                raise BadRequest("options must be an object")
            if not target:
                raise BadRequest("target is required")
            result = run_tool(target, options)
        except BadRequest as exc:
            self._send(400, {"detail": str(exc)})
            return
        except (ValueError, UnicodeDecodeError):
            self._send(400, {"detail": "invalid JSON payload"})
            return
        except Exception:  # pragma: no cover - defensive
            logger.exception("runner failure")
            self._send(500, {"detail": "runner failure"})
            return

        self._send(200, result)


def main() -> None:
    if TOOL not in BUILDERS:
        raise SystemExit(f"RUNNER_TOOL must be one of {sorted(BUILDERS)} (got {TOOL!r})")
    if not TOKEN:
        logger.warning("RUNNER_TOKEN is empty: the runner accepts unauthenticated requests")
    server = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)  # noqa: S104 - container-internal
    logger.info("listening tool=%s port=%s", TOOL, PORT)
    try:
        server.serve_forever()
    except KeyboardInterrupt:  # pragma: no cover
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
