"""Momentum indicators: RSI, RSI Divergence, MACD, MACD Reversal, Stochastic."""
from __future__ import annotations

import math
from typing import Any, Optional

import numpy as np
import pandas as pd


# ─── RSI ────────────────────────────────────────

def compute_rsi(closes: pd.Series, period: int = 14) -> float:
    if len(closes) < period + 1:
        return float("nan")
    delta = closes.diff()
    gain = delta.clip(lower=0.0)
    loss = -delta.clip(upper=0.0)
    avg_gain = gain.rolling(window=period, min_periods=period).mean()
    avg_loss = loss.rolling(window=period, min_periods=period).mean()
    last_gain = avg_gain.iloc[-1]
    last_loss = avg_loss.iloc[-1]
    if pd.isna(last_gain) or pd.isna(last_loss):
        return float("nan")
    if last_loss == 0:
        return 100.0
    rs = last_gain / last_loss
    return 100.0 - (100.0 / (1.0 + rs))


def detect_rsi_divergence(
    closes: pd.Series, period: int = 14, lookback: int = 30
) -> dict[str, Any]:
    """Detect bullish/bearish RSI divergence over lookback window."""
    result: dict[str, Any] = {
        "bullish_divergence": False,
        "bearish_divergence": False,
        "divergence_strength": 0.0,
    }
    if len(closes) < period + lookback:
        return result

    rsi_series = pd.Series(dtype=float)
    for i in range(lookback):
        idx = len(closes) - lookback + i
        rsi_val = compute_rsi(closes.iloc[: idx + 1], period)
        rsi_series = pd.concat([rsi_series, pd.Series([rsi_val])], ignore_index=True)

    price_window = closes.iloc[-lookback:].reset_index(drop=True)

    # Find local highs and lows (simple: first half vs second half)
    mid = lookback // 2
    price_first_high = price_window.iloc[:mid].max()
    price_second_high = price_window.iloc[mid:].max()
    rsi_first_high = rsi_series.iloc[:mid].max()
    rsi_second_high = rsi_series.iloc[mid:].max()

    price_first_low = price_window.iloc[:mid].min()
    price_second_low = price_window.iloc[mid:].min()
    rsi_first_low = rsi_series.iloc[:mid].min()
    rsi_second_low = rsi_series.iloc[mid:].min()

    # Bearish: price higher high + RSI lower high
    if price_second_high > price_first_high and rsi_second_high < rsi_first_high:
        result["bearish_divergence"] = True
        result["divergence_strength"] = min(
            1.0, abs(rsi_first_high - rsi_second_high) / 20.0
        )

    # Bullish: price lower low + RSI higher low
    if price_second_low < price_first_low and rsi_second_low > rsi_first_low:
        result["bullish_divergence"] = True
        result["divergence_strength"] = min(
            1.0, abs(rsi_second_low - rsi_first_low) / 20.0
        )

    return result


# ─── MACD ───────────────────────────────────────

def compute_macd(
    closes: pd.Series, fast: int = 12, slow: int = 26, signal_period: int = 9
) -> dict[str, float]:
    if len(closes) < slow + signal_period:
        return {"macd": float("nan"), "signal": float("nan"), "histogram": float("nan")}
    ema_fast = closes.ewm(span=fast, adjust=False).mean()
    ema_slow = closes.ewm(span=slow, adjust=False).mean()
    macd_line = ema_fast - ema_slow
    signal_line = macd_line.ewm(span=signal_period, adjust=False).mean()
    histogram = macd_line - signal_line
    return {
        "macd": round(float(macd_line.iloc[-1]), 6),
        "signal": round(float(signal_line.iloc[-1]), 6),
        "histogram": round(float(histogram.iloc[-1]), 6),
    }


def detect_macd_reversal(
    closes: pd.Series, fast: int = 12, slow: int = 26, signal_period: int = 9
) -> dict[str, Any]:
    """Detect MACD histogram zero-cross or slope change."""
    result: dict[str, Any] = {"reversal": None, "histogram_slope": 0.0}
    if len(closes) < slow + signal_period + 3:
        return result

    ema_fast = closes.ewm(span=fast, adjust=False).mean()
    ema_slow = closes.ewm(span=slow, adjust=False).mean()
    macd_line = ema_fast - ema_slow
    signal_line = macd_line.ewm(span=signal_period, adjust=False).mean()
    histogram = macd_line - signal_line

    h_now = float(histogram.iloc[-1])
    h_prev = float(histogram.iloc[-2])
    h_prev2 = float(histogram.iloc[-3])

    # Zero-cross detection
    if h_prev <= 0 < h_now:
        result["reversal"] = "bullish"
    elif h_prev >= 0 > h_now:
        result["reversal"] = "bearish"
    # Slope change (momentum shift without zero-cross)
    elif h_now > h_prev > 0 and h_prev < h_prev2:
        result["reversal"] = "bullish"
    elif h_now < h_prev < 0 and h_prev > h_prev2:
        result["reversal"] = "bearish"

    result["histogram_slope"] = round(h_now - h_prev, 6)
    return result


# ─── Stochastic Oscillator ─────────────────────

def compute_stochastic(
    highs: pd.Series,
    lows: pd.Series,
    closes: pd.Series,
    k_period: int = 14,
    d_period: int = 3,
) -> dict[str, Any]:
    """Compute Stochastic %K and %D."""
    if len(closes) < k_period + d_period:
        return {"k": float("nan"), "d": float("nan"), "overbought": False, "oversold": False}

    lowest_low = lows.rolling(window=k_period).min()
    highest_high = highs.rolling(window=k_period).max()
    denom = highest_high - lowest_low
    denom = denom.replace(0, float("nan"))
    k_raw = ((closes - lowest_low) / denom) * 100
    k_smooth = k_raw.rolling(window=d_period).mean()
    d_smooth = k_smooth.rolling(window=d_period).mean()

    k_val = float(k_smooth.iloc[-1]) if not pd.isna(k_smooth.iloc[-1]) else float("nan")
    d_val = float(d_smooth.iloc[-1]) if not pd.isna(d_smooth.iloc[-1]) else float("nan")

    return {
        "k": round(k_val, 2) if not math.isnan(k_val) else None,
        "d": round(d_val, 2) if not math.isnan(d_val) else None,
        "overbought": k_val > 80 if not math.isnan(k_val) else False,
        "oversold": k_val < 20 if not math.isnan(k_val) else False,
    }
