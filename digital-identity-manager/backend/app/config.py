"""Application configuration.

All settings are read from environment variables (see ``.env.example``).
Nothing in this file may contain a real secret: defaults are development-only
placeholders and the application refuses to start in production mode when the
default secret key is still in place.
"""

from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

LLMProviderName = Literal["disabled", "claude", "openai"]

DEV_SECRET_KEY = "dev-only-insecure-secret-change-me"  # noqa: S105 - rejected in production


class Settings(BaseSettings):
    """Runtime settings for the Digital Identity Manager backend."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # --- General -----------------------------------------------------------
    app_name: str = "Digital Identity Manager"
    environment: Literal["development", "production", "test"] = "development"
    debug: bool = False
    api_prefix: str = "/api"

    # --- Database ----------------------------------------------------------
    postgres_host: str = "postgres"
    postgres_port: int = 5432
    postgres_db: str = "dim"
    postgres_user: str = "dim"
    postgres_password: str = "dim"  # noqa: S105 - overridden by POSTGRES_PASSWORD
    database_url: str | None = None

    # --- Security ----------------------------------------------------------
    secret_key: str = DEV_SECRET_KEY
    access_token_ttl_minutes: int = 60 * 12
    cors_origins: list[str] = Field(default_factory=lambda: ["http://localhost:5173"])
    bootstrap_admin_email: str | None = None
    bootstrap_admin_password: str | None = None

    # --- Legal / ethical guardrails ---------------------------------------
    # The lab may only be used against identities the operator owns or is
    # explicitly authorised to audit. Scans stay disabled until acknowledged.
    require_authorization_ack: bool = True

    # --- OSINT tool runners (reachable on the ``osint`` docker network) -----
    maigret_runner_url: str | None = "http://maigret:8080"
    sherlock_runner_url: str | None = "http://sherlock:8080"
    holehe_runner_url: str | None = "http://holehe:8080"
    openosint_url: str | None = None
    flowsint_url: str | None = None
    osint_runner_token: str | None = None
    osint_request_timeout_seconds: int = 900

    # --- Outbound network policy ------------------------------------------
    allow_outbound_http: bool = False
    hibp_api_key: str | None = None
    hibp_api_base: str = "https://haveibeenpwned.com/api/v3"
    http_user_agent: str = "digital-identity-manager/1.0 (self-audit)"

    # --- Storage -----------------------------------------------------------
    evidence_dir: str = "/data/evidence"
    reports_dir: str = "/data/reports"
    photos_dir: str = "/data/evidence/photos"
    max_upload_bytes: int = 16 * 1024 * 1024

    # --- LLM abstraction ---------------------------------------------------
    llm_provider: LLMProviderName = "disabled"
    llm_model: str | None = None
    llm_api_key: str | None = None
    llm_api_base: str | None = None
    llm_max_output_tokens: int = 1024
    llm_timeout_seconds: int = 60
    # Data minimisation switches - highly sensitive categories stay local by
    # default and are never shipped to a third-party model.
    llm_allow_addresses: bool = False
    llm_allow_phone_numbers: bool = False
    llm_allow_full_emails: bool = False

    # --- Correlation engine ------------------------------------------------
    correlation_auto_max_score: int = 95
    correlation_suggest_threshold: int = 40

    # --- Background workers ------------------------------------------------
    workers_enabled: bool = True
    worker_poll_seconds: int = 5
    # Periodic verification that deleted data did not reappear.
    recheck_interval_days: int = 30
    recheck_poll_seconds: int = 3600

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split_origins(cls, value: object) -> object:
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        return value

    @property
    def sqlalchemy_url(self) -> str:
        if self.database_url:
            return self.database_url
        return (
            f"postgresql+psycopg://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    @property
    def is_production(self) -> bool:
        return self.environment == "production"

    def validate_runtime(self) -> None:
        """Fail fast on unsafe production configuration."""
        if self.is_production and self.secret_key == DEV_SECRET_KEY:
            raise RuntimeError(
                "SECRET_KEY must be set to a unique value in production. "
                "Generate one with: python -c 'import secrets; print(secrets.token_urlsafe(48))'"
            )


@lru_cache
def get_settings() -> Settings:
    return Settings()
