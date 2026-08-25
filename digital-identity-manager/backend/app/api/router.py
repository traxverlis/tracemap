"""Aggregate API router."""

from __future__ import annotations

from fastapi import APIRouter

from app.api.routes import (
    ai,
    auth,
    findings,
    identity,
    inventory,
    overview,
    privacy,
    relationships,
    scans,
    settings,
)

api_router = APIRouter(prefix="/api")
api_router.include_router(auth.router)
api_router.include_router(identity.router)
api_router.include_router(inventory.router)
api_router.include_router(findings.router)
api_router.include_router(relationships.router)
api_router.include_router(scans.router)
api_router.include_router(privacy.router)
api_router.include_router(overview.router)
api_router.include_router(ai.router)
api_router.include_router(settings.router)

__all__ = ["api_router"]
