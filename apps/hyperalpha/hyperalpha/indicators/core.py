"""Orchestrator: compute all indicators from candle data."""
from __future__ import annotations

import math
from typing import Any

import numpy as np
import pandas as pd

from hyperalpha.indicators.momentum import (
    compute_rsi,
    detect_rsi_divergence,
    compute_macd,
    detect_macd_reversal,
    compute_stochastic,
)
from hyperalpha.indicators.trend import (
    compute_ema_set,
    detect_golden_death_cross,
    compute_ichimoku,
)
from hyperalpha.indicators.volatility import (
    compute_bollinger,
    detect_bollinger_squeeze,
    compute_atr,
    compute_chandelier_exit,
)
from hyperalpha.indicators.volume import compute_vwap, detect_vwap_reclaim
from hyperalpha.indicators.fibonacci import find_fibonacci_confluence
from hyperalpha.indicators.stat_arb_metrics import (
    compute_z_score,
    compute_hurst,
    compute_half_life,
)

MIN_CANDLES_RSI = 14
MIN_CANDLES_MACD = 35
MIN_CANDLES_BOLLINGER = 20
MIN_CANDLES_ATR = 15
MIN_CANDLES_STOCHASTIC = 17
MIN_CANDLES_ICHIMOKU = 78
MIN_CANDLES_FIBONACCI = 30
MIN_CANDLES_EMA_200 = 200


def _to_df(candles: list[dict]) -> pd.DataFrame:
    """Convert candle list to DataFrame with normalized columns."""
    df = pd.DataFrame(candles)
    col_map: dict[str, str] = {}
    for col in df.columns:
        lower = col.lower()
        if lower in ("c", "close"):
            col_map[col] = "close"
        elif lower in ("h", "high"):
            col_map[col] = "high"
        elif lower in ("l", "low"):
            col_map[col] = "low"
        elif lower in ("o", "open"):
            col_map[col] = "open"
        elif lower in ("v", "vol", "volume"):
            col_map[col] = "volume"
    return df.rename(columns=col_map)


def compute_all_indicators(candles: list[dict]) -> dict[str, Any]:
    """Compute all technical indicators + stat-arb metrics from candle data."""
    if not candles:
        return {"data_quality": 0.0, "error": "No candle data"}

    df = _to_df(candles)
    if "close" not in df.columns:
        return {"data_quality": 0.0, "error": "Missing 'close' column"}

    closes = df["close"].astype(float)
    highs = df["high"].astype(float) if "high" in df.columns else closes
    lows = df["low"].astype(float) if "low" in df.columns else closes
    volumes = df["volume"].astype(float) if "volume" in df.columns else pd.Series(
        np.zeros(len(closes)), dtype=float
    )

    n = len(closes)
    indicators: dict[str, Any] = {"candle_count": n}
    computed = 0
    total = 14  # All indicator groups

    # RSI
    if n >= MIN_CANDLES_RSI + 1:
        rsi = compute_rsi(closes)
        indicators["rsi"] = rsi if not math.isnan(rsi) else None
        if indicators["rsi"] is not None:
            computed += 1
    else:
        indicators["rsi"] = None

    # RSI Divergence
    div = detect_rsi_divergence(closes)
    indicators["rsi_divergence"] = div
    if div["bullish_divergence"] or div["bearish_divergence"]:
        computed += 1

    # MACD
    if n >= MIN_CANDLES_MACD:
        macd = compute_macd(closes)
        indicators["macd"] = macd
        if not math.isnan(macd["macd"]):
            computed += 1
    else:
        indicators["macd"] = None

    # MACD Reversal
    macd_rev = detect_macd_reversal(closes)
    indicators["macd_reversal"] = macd_rev

    # Stochastic
    if n >= MIN_CANDLES_STOCHASTIC:
        stoch = compute_stochastic(highs, lows, closes)
        indicators["stochastic"] = stoch
        if stoch["k"] is not None:
            computed += 1
    else:
        indicators["stochastic"] = None

    # Bollinger Bands
    if n >= MIN_CANDLES_BOLLINGER:
        boll = compute_bollinger(closes)
        indicators["bollinger"] = boll
        if not math.isnan(boll["upper"]):
            computed += 1
    else:
        indicators["bollinger"] = None

    # Bollinger Squeeze
    squeeze = detect_bollinger_squeeze(closes)
    indicators["bollinger_squeeze"] = squeeze

    # ATR
    if n >= MIN_CANDLES_ATR:
        atr = compute_atr(highs, lows, closes)
        indicators["atr"] = atr if not math.isnan(atr) else None
        if indicators["atr"] is not None:
            computed += 1
    else:
        indicators["atr"] = None

    # Chandelier Exit
    chandelier = compute_chandelier_exit(highs, lows, closes)
    indicators["chandelier_exit"] = chandelier

    # EMAs (20, 50 always; 200 only if enough data)
    ema_periods = (20, 50, 200) if n >= MIN_CANDLES_EMA_200 else (20, 50)
    emas = compute_ema_set(closes, ema_periods)
    indicators.update(emas)
    if emas.get("ema_20") is not None:
        computed += 1

    # Golden/Death Cross (needs 200+ candles)
    cross = detect_golden_death_cross(closes)
    indicators["golden_death_cross"] = cross

    # Ichimoku
    if n >= MIN_CANDLES_ICHIMOKU:
        ichimoku = compute_ichimoku(highs, lows, closes)
        indicators["ichimoku"] = ichimoku
        if ichimoku["trend"] is not None:
            computed += 1
    else:
        indicators["ichimoku"] = None

    # VWAP
    if volumes.sum() > 0 and n >= 1:
        vwap = compute_vwap(highs, lows, closes, volumes)
        indicators["vwap"] = vwap if not math.isnan(vwap) else None
        if indicators["vwap"] is not None:
            computed += 1
    else:
        indicators["vwap"] = None

    # VWAP Reclaim
    vwap_reclaim = detect_vwap_reclaim(highs, lows, closes, volumes)
    indicators["vwap_reclaim"] = vwap_reclaim

    # Fibonacci
    if n >= MIN_CANDLES_FIBONACCI:
        fib = find_fibonacci_confluence(closes, highs, lows)
        indicators["fibonacci"] = fib
        if fib["levels"] is not None:
            computed += 1
    else:
        indicators["fibonacci"] = None

    # Z-score
    z = compute_z_score(closes)
    indicators["z_score"] = z if not math.isnan(z) else None
    if indicators["z_score"] is not None:
        computed += 1

    # Hurst exponent
    hurst = compute_hurst(closes)
    indicators["hurst_exponent"] = hurst if not math.isnan(hurst) else None
    if indicators["hurst_exponent"] is not None:
        computed += 1

    # Half-life
    hl = compute_half_life(closes)
    indicators["half_life"] = hl if not math.isnan(hl) else None

    indicators["data_quality"] = round(computed / total, 2) if total > 0 else 0.0
    return indicators
