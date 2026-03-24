"""Volume indicators: VWAP, VWAP Reclaim."""
from __future__ import annotations

import math
from typing import Any

import pandas as pd


def compute_vwap(
    highs: pd.Series, lows: pd.Series, closes: pd.Series, volumes: pd.Series
) -> float:
    if len(closes) < 1 or volumes.sum() == 0:
        return float("nan")
    typical_price = (highs + lows + closes) / 3.0
    cum_tp_vol = (typical_price * volumes).cumsum()
    cum_vol = volumes.cumsum()
    vwap_series = cum_tp_vol / cum_vol
    val = vwap_series.iloc[-1]
    return float("nan") if pd.isna(val) else round(float(val), 6)


def detect_vwap_reclaim(
    highs: pd.Series,
    lows: pd.Series,
    closes: pd.Series,
    volumes: pd.Series,
    lookback: int = 5,
) -> dict[str, Any]:
    """Detect if price reclaimed VWAP from below (bullish) or lost it from above (bearish)."""
    result: dict[str, Any] = {
        "reclaim": None,
        "vwap": None,
        "distance_pct": None,
    }
    if len(closes) < lookback + 1 or volumes.sum() == 0:
        return result

    vwap = compute_vwap(highs, lows, closes, volumes)
    if math.isnan(vwap) or vwap == 0:
        return result

    price = float(closes.iloc[-1])
    result["vwap"] = vwap
    result["distance_pct"] = round((price - vwap) / vwap * 100, 4)

    # Check if price was below VWAP in recent lookback and now above
    recent_closes = closes.iloc[-lookback - 1 : -1]
    was_below = (recent_closes < vwap).any()
    was_above = (recent_closes > vwap).any()

    if was_below and price > vwap:
        result["reclaim"] = "bullish"
    elif was_above and price < vwap:
        result["reclaim"] = "bearish"

    return result
