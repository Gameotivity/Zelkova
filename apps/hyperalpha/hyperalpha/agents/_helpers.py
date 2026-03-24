"""Shared helpers for analyst agents."""
from __future__ import annotations

from langchain_anthropic import ChatAnthropic

from hyperalpha.config import settings
from hyperalpha.types import AnalystReport, Signal


def neutral_fallback(agent_name: str, ticker: str, reason: str) -> AnalystReport:
    """Return a safe NEUTRAL report when analysis cannot be performed."""
    return AnalystReport(
        agent_name=agent_name,
        ticker=ticker,
        signal=Signal.NEUTRAL,
        confidence=0.0,
        reasoning=f"Analysis unavailable: {reason}",
        key_metrics={},
        data_quality=0.0,
    )


def parse_signal(text: str) -> Signal:
    """Parse a SIGNAL: line from LLM output into a Signal enum."""
    upper = text.upper()
    for line in upper.splitlines():
        stripped = line.strip()
        if stripped.startswith("SIGNAL:"):
            value = stripped.split(":", 1)[1].strip()
            if "STRONG_BUY" in value or "STRONG BUY" in value:
                return Signal.STRONG_BUY
            elif "STRONG_SELL" in value or "STRONG SELL" in value:
                return Signal.STRONG_SELL
            elif "BUY" in value:
                return Signal.BUY
            elif "SELL" in value:
                return Signal.SELL
            elif "NEUTRAL" in value:
                return Signal.NEUTRAL

    if "STRONG_BUY" in upper or "STRONG BUY" in upper:
        return Signal.STRONG_BUY
    elif "STRONG_SELL" in upper or "STRONG SELL" in upper:
        return Signal.STRONG_SELL
    elif "BUY" in upper:
        return Signal.BUY
    elif "SELL" in upper:
        return Signal.SELL
    return Signal.NEUTRAL


def parse_confidence(text: str) -> float:
    """Extract CONFIDENCE: <float> from LLM output, default 0.5."""
    upper = text.upper()
    for line in upper.splitlines():
        stripped = line.strip()
        if stripped.startswith("CONFIDENCE:"):
            try:
                val = float(stripped.split(":", 1)[1].strip())
                return max(0.0, min(1.0, val))
            except (ValueError, IndexError):
                pass
    return 0.5


def build_llm(temperature: float, max_tokens: int) -> ChatAnthropic:
    """Construct a ChatAnthropic instance with standard settings."""
    return ChatAnthropic(
        model=settings.quick_think_model,
        anthropic_api_key=settings.anthropic_api_key,
        temperature=temperature,
        max_tokens=max_tokens,
        timeout=settings.llm_timeout_seconds,
        max_retries=settings.llm_max_retries,
    )
