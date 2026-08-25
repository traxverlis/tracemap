"""Shared pytest fixtures (SQLite, no external services)."""

from __future__ import annotations

import os
from collections.abc import Iterator
from pathlib import Path

import pytest

os.environ.setdefault("SECRET_KEY", "test-secret-key-with-enough-entropy-1234567890")
os.environ.setdefault("ENVIRONMENT", "test")
os.environ.setdefault("WORKERS_ENABLED", "false")
os.environ.setdefault("LLM_PROVIDER", "disabled")
os.environ.setdefault("ALLOW_OUTBOUND_HTTP", "false")


@pytest.fixture(scope="session", autouse=True)
def _storage_dirs(tmp_path_factory: pytest.TempPathFactory) -> None:
    root = tmp_path_factory.mktemp("storage")
    for name, key in (
        ("evidence", "EVIDENCE_DIR"),
        ("reports", "REPORTS_DIR"),
        ("photos", "PHOTOS_DIR"),
        ("data", "DATA_DIR"),
    ):
        path = root / name
        path.mkdir(parents=True, exist_ok=True)
        os.environ[key] = str(path)


@pytest.fixture()
def db_path(tmp_path: Path) -> str:
    return str(tmp_path / "test.db")


@pytest.fixture()
def session(db_path: str) -> Iterator:
    os.environ["DATABASE_URL"] = f"sqlite:///{db_path}"

    from app.config import get_settings

    get_settings.cache_clear()

    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker

    from app.models import Base

    engine = create_engine(f"sqlite:///{db_path}", future=True)
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False, future=True)
    db = factory()
    try:
        yield db
    finally:
        db.close()
        engine.dispose()


@pytest.fixture()
def client(db_path: str) -> Iterator:
    os.environ["DATABASE_URL"] = f"sqlite:///{db_path}"

    from app.config import get_settings

    get_settings.cache_clear()

    from fastapi.testclient import TestClient
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker

    from app.database import get_db
    from app.main import create_app
    from app.models import Base

    engine = create_engine(f"sqlite:///{db_path}", future=True)
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False, future=True)

    def override_get_db():
        db = factory()
        try:
            yield db
            db.commit()
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()

    app = create_app()
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
    engine.dispose()


@pytest.fixture()
def auth_client(client):
    """A client authenticated as the bootstrap operator."""
    response = client.post(
        "/api/auth/bootstrap",
        json={
            "email": "owner@example.com",
            "password": "correct horse battery staple",
            "display_name": "Owner",
        },
    )
    assert response.status_code == 201, response.text
    token = response.json()["access_token"]
    client.headers.update({"Authorization": "Bearer " + token})
    return client


@pytest.fixture()
def identity(auth_client) -> dict:
    response = auth_client.post(
        "/api/identities",
        json={"label": "Me", "description": "My own identity", "country": "FR"},
    )
    assert response.status_code == 201, response.text
    payload = response.json()
    auth_client.post(
        f"/api/identities/{payload['id']}/authorization", json={"acknowledged": True}
    )
    return payload
