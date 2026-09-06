"""
ChainTrace API Configuration
Reads environment variables via pydantic-settings with defensive defaults.
"""

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


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

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]


settings = Settings()
