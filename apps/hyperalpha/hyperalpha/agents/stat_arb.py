"""HyperAlpha Layer 4 — Statistical Arbitrage Engine (No LLM)."""
from __future__ import annotations

from typing import Optional

import structlog

from hyperalpha.types import HyperAlphaState, Signal, StatArbSignal

log = structlog.get_logger(__name__)

MAX_EXPECTED_RETURN_PCT = 15.0


def _funding_rate_signal(market_data: dict) -> Optional[StatArbSignal]:
    """Contrarian funding rate arbitrage."""
    funding_rate = market_data.get("funding_rate")
    if funding_rate is None:
        return None
    annualized = funding_rate * 1095
    ticker = market_data.get("ticker", "UNKNOWN")
    if abs(annualized) < 0.10:
        return None

    if annualized > 0.30:
        signal, confidence = Signal.SELL, min(0.8, 0.5 + abs(annualized) * 0.3)
    elif annualized < -0.30:
        signal, confidence = Signal.BUY, min(0.8, 0.5 + abs(annualized) * 0.3)
    elif annualized > 0.10:
        signal, confidence = Signal.SELL, 0.4
    else:
        signal, confidence = Signal.BUY, 0.4

    volatility = market_data.get("volatility_24h", 0.02)
    raw_return = abs(annualized) * 0.1 / max(volatility, 0.005)
    return StatArbSignal(
        strategy_name="funding_rate_arb", pair=ticker, signal=signal,
        z_score=annualized / max(volatility, 0.005),
        expected_return_pct=round(min(MAX_EXPECTED_RETURN_PCT, raw_return), 2),
        holding_period_hours=8, confidence=round(confidence, 3),
        metadata={"funding_rate_8h": funding_rate, "annualized": round(annualized, 4)},
    )


def _mean_reversion_signal(market_data: dict) -> Optional[StatArbSignal]:
    """Mean reversion signal based on z-score (Hurst < 0.5 only)."""
    z_score = market_data.get("price_z_score")
    hurst = market_data.get("hurst_exponent")
    ticker = market_data.get("ticker", "UNKNOWN")
    if z_score is None or hurst is None or hurst >= 0.5:
        return None
    abs_z = abs(z_score)
    if abs_z < 1.5:
        return None

    signal = Signal.SELL if z_score > 0 else Signal.BUY
    confidence = min(0.85, 0.4 + abs_z * 0.15)
    reversion_strength = (0.5 - hurst) * 2
    volatility = market_data.get("volatility_24h", 0.02)
    raw_return = abs_z * reversion_strength * 5.0 / max(volatility, 0.005)
    return StatArbSignal(
        strategy_name="mean_reversion", pair=ticker, signal=signal,
        z_score=round(z_score, 3),
        expected_return_pct=round(min(MAX_EXPECTED_RETURN_PCT, raw_return), 2),
        holding_period_hours=24, confidence=round(confidence, 3),
        metadata={"hurst_exponent": hurst, "reversion_strength": round(reversion_strength, 3)},
    )


def _order_book_imbalance_signal(market_data: dict) -> Optional[StatArbSignal]:
    """Short-term signal from bid/ask imbalance."""
    bid_depth = market_data.get("bid_depth_usd")
    ask_depth = market_data.get("ask_depth_usd")
    ticker = market_data.get("ticker", "UNKNOWN")
    if bid_depth is None or ask_depth is None:
        return None
    total = bid_depth + ask_depth
    if total < 1000:
        return None
    imbalance = (bid_depth - ask_depth) / total
    if abs(imbalance) < 0.15:
        return None

    if imbalance > 0.30:
        signal, confidence = Signal.BUY, min(0.7, 0.4 + imbalance * 0.5)
    elif imbalance > 0.15:
        signal, confidence = Signal.BUY, 0.35
    elif imbalance < -0.30:
        signal, confidence = Signal.SELL, min(0.7, 0.4 + abs(imbalance) * 0.5)
    else:
        signal, confidence = Signal.SELL, 0.35

    volatility = market_data.get("volatility_24h", 0.02)
    raw_return = abs(imbalance) * 3.0 / max(volatility, 0.005)
    return StatArbSignal(
        strategy_name="order_book_imbalance", pair=ticker, signal=signal,
        z_score=round(imbalance / 0.15, 3),
        expected_return_pct=round(min(MAX_EXPECTED_RETURN_PCT, raw_return), 2),
        holding_period_hours=4, confidence=round(confidence, 3),
        metadata={"imbalance_ratio": round(imbalance, 4)},
    )


def run_stat_arb(state: HyperAlphaState) -> dict:
    """Layer 4: Run all stat arb strategies and return signals."""
    market_data = state.get("market_data", {})
    signals: list[StatArbSignal] = []
    for gen in [_funding_rate_signal, _mean_reversion_signal, _order_book_imbalance_signal]:
        try:
            sig = gen(market_data)
            if sig is not None:
                signals.append(sig)
                log.info("stat_arb_signal", strategy=sig.strategy_name, signal=sig.signal.value, confidence=sig.confidence)
        except Exception as exc:
            log.error("stat_arb_error", strategy=gen.__name__, error=str(exc))
    log.info("stat_arb_complete", signal_count=len(signals))
    return {"stat_arb_signals": signals}
