"""
HyperAlpha Configuration — Production-grade settings with validation.
"""
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, field_validator
from typing import Optional

_ENV_FILE = Path(__file__).resolve().parent.parent / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(_ENV_FILE),
        env_file_encoding="utf-8",
    )

    # Environment
    environment: str = "dev"

    # LLM
    anthropic_api_key: str = ""
    deep_think_model: str = "claude-sonnet-4-20250514"
    quick_think_model: str = "claude-haiku-4-5-20251001"
    llm_timeout_seconds: int = 30
    llm_max_retries: int = 2

    # Hyperliquid
    hl_account_address: str = ""
    hl_secret_key: str = ""
    hl_use_testnet: bool = False

    # Data Sources
    twitter_bearer_token: Optional[str] = None
    coingecko_api_key: Optional[str] = None

    # Database
    postgres_url: str = "sqlite+aiosqlite:///hyperalpha.db"
    redis_url: str = "redis://localhost:6379/0"

    # Telegram
    telegram_bot_token: Optional[str] = None
    telegram_chat_id: Optional[str] = None

    # Risk Management — conservative defaults per CLAUDE.md
    max_position_size_usd: float = 1000
    max_portfolio_drawdown_pct: float = 10
    max_single_trade_risk_pct: float = 2
    max_correlation_exposure: float = 0.7
    max_leverage: float = 3.0

    # Agent Config
    max_debate_rounds: int = 2
    confidence_threshold: float = 0.5

    # Network
    hl_request_timeout: int = 15
    hl_max_retries: int = 3
    pipeline_timeout_seconds: int = 300

    # Cache TTLs (seconds)
    cache_mids_ttl: int = 10
    cache_funding_ttl: int = 60
    cache_snapshot_ttl: int = 30

    # CrewAI
    crew_verbose: bool = True
    crew_max_rpm: int = 10  # rate limit for LLM calls (keep under API limits)

    # RAG
    rag_vector_store_path: str = str(Path(__file__).resolve().parent / "rag" / "chroma_db")
    rag_collection_name: str = "hyperalpha_knowledge"
    rag_chunk_size: int = 500
    rag_chunk_overlap: int = 50

    @field_validator("max_leverage")
    @classmethod
    def validate_leverage(cls, v: float) -> float:
        if v < 0.1 or v > 50:
            raise ValueError("max_leverage must be between 0.1 and 50")
        return v

    @field_validator("max_position_size_usd")
    @classmethod
    def validate_position_size(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("max_position_size_usd must be positive")
        return v

    @field_validator("confidence_threshold")
    @classmethod
    def validate_confidence(cls, v: float) -> float:
        if v < 0 or v > 1:
            raise ValueError("confidence_threshold must be between 0 and 1")
        return v

    @property
    def hl_api_url(self) -> str:
        if self.hl_use_testnet:
            return "https://api.hyperliquid-testnet.xyz"
        return "https://api.hyperliquid.xyz"

    @property
    def is_production(self) -> bool:
        return self.environment == "prod"


settings = Settings()
