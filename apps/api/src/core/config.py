"""
ChainTrace API Configuration
Reads environment variables via pydantic-settings with defensive defaults.
"""

import logging
import secrets

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", case_sensitive=True, extra="ignore"
    )

    # Application
    APP_NAME: str = "ChainTrace API"
    APP_VERSION: str = "0.1.0"
    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "INFO"
    DEBUG: bool = True

    # Server
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    # Security & Auth
    JWT_SECRET: str = "change-this-in-production-random-secret-key"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # Rate Limiting (per user per minute)
    RATE_LIMIT_LOGIN_PER_MINUTE: int = 10
    RATE_LIMIT_TRACE_PER_MINUTE: int = 20
    RATE_LIMIT_REPORT_PER_MINUTE: int = 10
    RATE_LIMIT_GENERAL_PER_MINUTE: int = 60

    # Request Body Size Limit (bytes)
    MAX_REQUEST_BODY_BYTES: int = 10 * 1024 * 1024  # 10 MB

    # Demo user passwords (override via env for non-dev environments)
    DEMO_INVESTIGATOR_PASSWORD: str = "Investigator123!"
    DEMO_ADMIN_PASSWORD: str = "AdminSecure123!"
    DEMO_ANALYST_PASSWORD: str = "AnalystSecure123!"
    DEMO_VIEWER_PASSWORD: str = "ViewerSecure123!"

    # PostgreSQL / SQLite
    DATABASE_URL: str = "sqlite+aiosqlite:///./data/chaintrace.db"
    DATABASE_FALLBACK_SQLITE: bool = True

    # Neo4j Graph DB
    NEO4J_URI: str = "bolt://localhost:7687"
    NEO4J_USER: str = "neo4j"
    NEO4J_PASSWORD: str = "chaintrace_secure_pass"
    NEO4J_DATABASE: str = "neo4j"
    NEO4J_MOCK_FALLBACK: bool = True

    # Redis Queue & Cache
    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_MOCK_FALLBACK: bool = True

    # Blockchain Provider Endpoints
    TRON_API_URL: str = "https://api.trongrid.io"
    TRON_API_KEY: str = ""
    ETH_RPC_URL: str = "https://eth.llamarpc.com"
    ETHEREUM_RPC_URL: str = ""  # If unset, defaults to ETH_RPC_URL
    BSC_RPC_URL: str = "https://binance.llamarpc.com"
    POLYGON_RPC_URL: str = "https://polygon.llamarpc.com"
    ETHERSCAN_API_KEY: str = ""
    BTC_API_URL: str = "https://blockstream.info/api"

    # Blockchain Provider Resilience & Rate Limits
    PROVIDER_TIMEOUT_SECONDS: float = 10.0
    PROVIDER_MAX_RETRIES: int = 3
    PROVIDER_RATE_LIMIT_PER_SEC: float = 5.0
    BLOCKCHAIN_CACHE_TTL_SECONDS: int = 300

    # Defensive limits
    DEFAULT_MAX_HOPS: int = Field(default=4, ge=1, le=10)
    ABSOLUTE_MAX_HOPS: int = Field(default=7, ge=1, le=10)
    MAX_NODES_PER_JOB: int = 1000
    MAX_EDGES_PER_JOB: int = 2500
    TRACE_TIMEOUT_SECONDS: int = 60

    # Report Storage
    REPORTS_DIR: str = "./data/reports"

    _UNSAFE_JWT_DEFAULTS = {
        "change-this-in-production-random-secret-key",
        "change-this-to-a-secure-random-32-byte-hex-string-in-production",
    }

    @model_validator(mode="after")
    def validate_production_secrets(self) -> "Settings":
        """Refuse to start in non-development mode with default/placeholder secrets."""
        if self.ENVIRONMENT != "development":
            if self.JWT_SECRET in self._UNSAFE_JWT_DEFAULTS:
                raise ValueError(
                    "CRITICAL: JWT_SECRET must be changed from its default value "
                    "in non-development environments. Set a secure random value "
                    "via the JWT_SECRET environment variable."
                )
        elif self.JWT_SECRET in self._UNSAFE_JWT_DEFAULTS:
            logger.warning(
                "WARNING: Using default JWT_SECRET. This is acceptable for development "
                "but MUST be changed before production deployment."
            )
        return self

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]


settings = Settings()
