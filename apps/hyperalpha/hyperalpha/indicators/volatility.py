"""Volatility indicators: Bollinger Bands, Squeeze, ATR, Chandelier Exit."""
from __future__ import annotations

import math
from typing import Any

import pandas as pd


# ─── Bollinger Bands ────────────────────────────

def compute_bollinger(
    closes: pd.Series, period: int = 20, num_std: float = 2.0
) -> dict[str, float]:
    if len(closes) < period:
        return {"upper": float("nan"), "middle": float("nan"), "lower": float("nan"), "pct_b": float("nan")}
    sma = closes.rolling(window=period).mean()
    std = closes.rolling(window=period).std()
    upper = sma + num_std * std
    lower = sma - num_std * std
    last_upper = float(upper.iloc[-1])
    last_lower = float(lower.iloc[-1])
    last_middle = float(sma.iloc[-1])
    last_close = float(closes.iloc[-1])
    band_width = last_upper - last_lower
    pct_b = (last_close - last_lower) / band_width if band_width > 0 else 0.5
    return {
        "upper": round(last_upper, 6),
        "middle": round(last_middle, 6),
        "lower": round(last_lower, 6),
        "pct_b": round(pct_b, 4),
    }


def detect_bollinger_squeeze(
    closes: pd.Series, period: int = 20, lookback: int = 120
) -> dict[str, Any]:
    """Detect Bollinger Band squeeze (bandwidth contraction)."""
    result: dict[str, Any] = {"squeeze": False, "bandwidth": None, "bandwidth_percentile": None}
    if len(closes) < max(period, lookback):
        return result

    sma = closes.rolling(window=period).mean()
    std = closes.rolling(window=period).std()
    bandwidth = (2.0 * std / sma) * 100  # bandwidth as percentage

    bw_history = bandwidth.dropna().iloc[-lookback:]
    if len(bw_history) < 20:
        return result

    current_bw = float(bw_history.iloc[-1])
    percentile = float((bw_history < current_bw).sum() / len(bw_history) * 100)

    result["bandwidth"] = round(current_bw, 4)
    result["bandwidth_percentile"] = round(percentile, 1)
    result["squeeze"] = percentile < 15  # bottom 15% = squeeze

    return result


# ─── ATR ────────────────────────────────────────

def compute_atr(
    highs: pd.Series, lows: pd.Series, closes: pd.Series, period: int = 14
) -> float:
    if len(closes) < period + 1:
        return float("nan")
    prev_close = closes.shift(1)
    tr = pd.concat(
        [highs - lows, (highs - prev_close).abs(), (lows - prev_close).abs()],
        axis=1,
    ).max(axis=1)
    atr = tr.rolling(window=period, min_periods=period).mean()
    val = atr.iloc[-1]
    return float("nan") if pd.isna(val) else round(float(val), 6)


# ─── Chandelier Exit (ATR Trailing Stop) ───────

def compute_chandelier_exit(
    highs: pd.Series,
    lows: pd.Series,
    closes: pd.Series,
    atr_period: int = 22,
    multiplier: float = 3.0,
) -> dict[str, Any]:
    """Compute Chandelier Exit long/short stop levels."""
    if len(closes) < atr_period + 1:
        return {"long_stop": None, "short_stop": None, "signal": None}

    atr_val = compute_atr(highs, lows, closes, atr_period)
    if math.isnan(atr_val):
        return {"long_stop": None, "short_stop": None, "signal": None}

    highest_high = float(highs.iloc[-atr_period:].max())
    lowest_low = float(lows.iloc[-atr_period:].min())
    price = float(closes.iloc[-1])

    long_stop = round(highest_high - multiplier * atr_val, 6)
    short_stop = round(lowest_low + multiplier * atr_val, 6)

    signal = None
    if price > long_stop:
        signal = "long"  # price above long stop = stay long
    elif price < short_stop:
        signal = "short"  # price below short stop = stay short

    return {"long_stop": long_stop, "short_stop": short_stop, "signal": signal}
