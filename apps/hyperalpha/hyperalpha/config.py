"""
HyperAlpha Configuration — Production-grade settings with validation.
"""
from pydantic_settings import BaseSettings
from pydantic import Field, field_validator
from typing import Optional


class Settings(BaseSettings):
    # Environment
    environment: str = Field("dev", env="ENVIRONMENT")

    # LLM
    anthropic_api_key: str = Field("", env="ANTHROPIC_API_KEY")
    deep_think_model: str = Field("claude-sonnet-4-20250514", env="DEEP_THINK_MODEL")
    quick_think_model: str = Field("claude-haiku-4-5-20251001", env="QUICK_THINK_MODEL")
    llm_timeout_seconds: int = Field(30, env="LLM_TIMEOUT_SECONDS")
    llm_max_retries: int = Field(2, env="LLM_MAX_RETRIES")

    # Hyperliquid
    hl_account_address: str = Field("", env="HL_ACCOUNT_ADDRESS")
    hl_secret_key: str = Field("", env="HL_SECRET_KEY")
    hl_use_testnet: bool = Field(False, env="HL_USE_TESTNET")

    # Data Sources
    twitter_bearer_token: Optional[str] = Field(None, env="TWITTER_BEARER_TOKEN")
    coingecko_api_key: Optional[str] = Field(None, env="COINGECKO_API_KEY")

    # Database
    postgres_url: str = Field("sqlite+aiosqlite:///hyperalpha.db", env="POSTGRES_URL")
    redis_url: str = Field("redis://localhost:6379/0", env="REDIS_URL")

    # Telegram
    telegram_bot_token: Optional[str] = Field(None, env="TELEGRAM_BOT_TOKEN")
    telegram_chat_id: Optional[str] = Field(None, env="TELEGRAM_CHAT_ID")

    # Risk Management — conservative defaults per CLAUDE.md
    max_position_size_usd: float = Field(1000, env="MAX_POSITION_SIZE_USD")
    max_portfolio_drawdown_pct: float = Field(10, env="MAX_PORTFOLIO_DRAWDOWN_PCT")
    max_single_trade_risk_pct: float = Field(2, env="MAX_SINGLE_TRADE_RISK_PCT")
    max_correlation_exposure: float = Field(0.7, env="MAX_CORRELATION_EXPOSURE")
    max_leverage: float = Field(3.0, env="MAX_LEVERAGE")

    # Agent Config
    max_debate_rounds: int = Field(2, env="MAX_DEBATE_ROUNDS")
    confidence_threshold: float = Field(0.5, env="CONFIDENCE_THRESHOLD")

    # Network
    hl_request_timeout: int = Field(15, env="HL_REQUEST_TIMEOUT")
    hl_max_retries: int = Field(3, env="HL_MAX_RETRIES")
    pipeline_timeout_seconds: int = Field(300, env="PIPELINE_TIMEOUT_SECONDS")

    # Cache TTLs (seconds)
    cache_mids_ttl: int = Field(10, env="CACHE_MIDS_TTL")
    cache_funding_ttl: int = Field(60, env="CACHE_FUNDING_TTL")
    cache_snapshot_ttl: int = Field(30, env="CACHE_SNAPSHOT_TTL")

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

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
