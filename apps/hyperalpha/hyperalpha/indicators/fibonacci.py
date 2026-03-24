"""Fibonacci Retracement: swing detection and level computation."""
from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd


FIB_LEVELS = {
    "0.0": 0.0,
    "23.6": 0.236,
    "38.2": 0.382,
    "50.0": 0.500,
    "61.8": 0.618,
    "78.6": 0.786,
    "100.0": 1.0,
}


def find_swing_points(
    highs: pd.Series, lows: pd.Series, window: int = 5
) -> dict[str, Any]:
    """Find the most recent swing high and swing low using local extrema."""
    if len(highs) < window * 2 + 1:
        return {"swing_high": None, "swing_low": None, "swing_high_idx": None, "swing_low_idx": None}

    swing_high = None
    swing_high_idx = None
    swing_low = None
    swing_low_idx = None

    # Scan from most recent backwards
    for i in range(len(highs) - window - 1, window - 1, -1):
        local_window = highs.iloc[i - window : i + window + 1]
        if highs.iloc[i] == local_window.max() and swing_high is None:
            swing_high = float(highs.iloc[i])
            swing_high_idx = i

        local_window_low = lows.iloc[i - window : i + window + 1]
        if lows.iloc[i] == local_window_low.min() and swing_low is None:
            swing_low = float(lows.iloc[i])
            swing_low_idx = i

        if swing_high is not None and swing_low is not None:
            break

    return {
        "swing_high": swing_high,
        "swing_low": swing_low,
        "swing_high_idx": swing_high_idx,
        "swing_low_idx": swing_low_idx,
    }


def compute_fibonacci_levels(
    swing_high: float, swing_low: float
) -> dict[str, float]:
    """Compute Fibonacci retracement levels between swing points."""
    diff = swing_high - swing_low
    levels = {}
    for name, ratio in FIB_LEVELS.items():
        # Retracement from high: high - diff * ratio
        levels[f"fib_{name}"] = round(swing_high - diff * ratio, 6)
    return levels


def find_fibonacci_confluence(
    closes: pd.Series,
    highs: pd.Series,
    lows: pd.Series,
) -> dict[str, Any]:
    """Find Fibonacci levels and which one price is nearest."""
    result: dict[str, Any] = {
        "levels": None,
        "nearest_level": None,
        "nearest_price": None,
        "distance_pct": None,
        "swing_high": None,
        "swing_low": None,
    }

    swings = find_swing_points(highs, lows)
    if swings["swing_high"] is None or swings["swing_low"] is None:
        return result

    sh, sl = swings["swing_high"], swings["swing_low"]
    if sh <= sl:
        return result

    levels = compute_fibonacci_levels(sh, sl)
    price = float(closes.iloc[-1])

    result["levels"] = levels
    result["swing_high"] = sh
    result["swing_low"] = sl

    # Find nearest level
    min_dist = float("inf")
    for name, level_price in levels.items():
        dist = abs(price - level_price)
        if dist < min_dist:
            min_dist = dist
            result["nearest_level"] = name
            result["nearest_price"] = level_price

    if result["nearest_price"] and result["nearest_price"] > 0:
        result["distance_pct"] = round(
            (price - result["nearest_price"]) / result["nearest_price"] * 100, 4
        )

    return result
