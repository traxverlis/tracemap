"""Digital Identity Manager — FastAPI application entrypoint."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api import api_router
from app.config import get_settings
from app.workers import start_workers, stop_workers

__version__ = "0.1.0"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger("app")

DESCRIPTION = """
Self-hosted inventory and audit of **your own** digital identity.

This API only queries public sources and never bypasses authentication,
CAPTCHAs or any access control. Every correlation and every deletion request
requires an explicit human decision.
"""


def _ensure_directories() -> None:
    settings = get_settings()
    for directory in (settings.evidence_dir, settings.reports_dir, settings.photos_dir):
        try:
            Path(directory).mkdir(parents=True, exist_ok=True)
        except OSError:  # pragma: no cover - read-only mount
            logger.warning("storage.directory_unavailable path=%s", directory)


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    settings.validate_runtime()
    _ensure_directories()
    start_workers()
    logger.info(
        "startup environment=%s workers_enabled=%s llm_provider=%s",
        settings.environment,
        settings.workers_enabled,
        settings.llm_provider,
    )
    try:
        yield
    finally:
        stop_workers()


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="Digital Identity Manager",
        description=DESCRIPTION,
        version=__version__,
        lifespan=lifespan,
        docs_url="/api/docs",
        openapi_url="/api/openapi.json",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.middleware("http")
    async def security_headers(request: Request, call_next):
        response = await call_next(request)
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "no-referrer")
        response.headers.setdefault("Cache-Control", "no-store")
        return response

    @app.exception_handler(ValueError)
    async def value_error_handler(request: Request, exc: ValueError):  # pragma: no cover
        logger.warning("request.value_error path=%s", request.url.path)
        return JSONResponse(status_code=422, content={"detail": str(exc)})

    @app.get("/api/health", tags=["health"])
    def health() -> dict[str, str]:
        return {"status": "ok", "version": __version__}

    app.include_router(api_router)
    return app


app = create_app()
