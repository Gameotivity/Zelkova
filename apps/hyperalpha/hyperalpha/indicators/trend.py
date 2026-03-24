"""Trend indicators: EMA, Golden/Death Cross, Ichimoku Cloud."""
from __future__ import annotations

import math
from typing import Any

import pandas as pd


# ─── EMA ────────────────────────────────────────

def compute_ema(closes: pd.Series, period: int) -> float:
    if len(closes) < period:
        return float("nan")
    return float(closes.ewm(span=period, adjust=False).mean().iloc[-1])


def compute_ema_set(
    closes: pd.Series, periods: tuple[int, ...] = (20, 50, 200)
) -> dict[str, Any]:
    """Compute multiple EMAs. Returns dict with ema_{period} keys."""
    result: dict[str, Any] = {}
    for p in periods:
        val = compute_ema(closes, p)
        result[f"ema_{p}"] = round(val, 6) if not math.isnan(val) else None
    return result


def detect_golden_death_cross(closes: pd.Series) -> dict[str, Any]:
    """Detect EMA50/EMA200 crossover (golden cross / death cross)."""
    result: dict[str, Any] = {
        "cross": None,
        "ema_50": None,
        "ema_200": None,
        "distance_pct": None,
    }
    if len(closes) < 201:
        return result

    ema50 = closes.ewm(span=50, adjust=False).mean()
    ema200 = closes.ewm(span=200, adjust=False).mean()

    curr_50, curr_200 = float(ema50.iloc[-1]), float(ema200.iloc[-1])
    prev_50, prev_200 = float(ema50.iloc[-2]), float(ema200.iloc[-2])

    result["ema_50"] = round(curr_50, 6)
    result["ema_200"] = round(curr_200, 6)
    result["distance_pct"] = round((curr_50 - curr_200) / curr_200 * 100, 4) if curr_200 else None

    if prev_50 <= prev_200 and curr_50 > curr_200:
        result["cross"] = "golden"
    elif prev_50 >= prev_200 and curr_50 < curr_200:
        result["cross"] = "death"

    return result


# ─── Ichimoku Cloud ─────────────────────────────

def _period_midpoint(highs: pd.Series, lows: pd.Series, period: int) -> pd.Series:
    """(highest high + lowest low) / 2 over period."""
    return (highs.rolling(window=period).max() + lows.rolling(window=period).min()) / 2


def compute_ichimoku(
    highs: pd.Series,
    lows: pd.Series,
    closes: pd.Series,
    tenkan_period: int = 9,
    kijun_period: int = 26,
    senkou_b_period: int = 52,
) -> dict[str, Any]:
    """Compute Ichimoku Cloud components and trend signal."""
    min_needed = senkou_b_period + kijun_period
    if len(closes) < min_needed:
        return {
            "tenkan_sen": None,
            "kijun_sen": None,
            "senkou_a": None,
            "senkou_b": None,
            "chikou_span": None,
            "cloud_color": None,
            "price_vs_cloud": None,
            "trend": None,
            "tk_cross": None,
        }

    tenkan = _period_midpoint(highs, lows, tenkan_period)
    kijun = _period_midpoint(highs, lows, kijun_period)

    senkou_a = (tenkan + kijun) / 2
    senkou_b = _period_midpoint(highs, lows, senkou_b_period)

    # Current values (Senkou lines are displaced 26 periods forward,
    # so for the current cloud we use values from 26 periods ago)
    t_val = float(tenkan.iloc[-1])
    k_val = float(kijun.iloc[-1])
    sa_current = float(senkou_a.iloc[-kijun_period]) if len(senkou_a) > kijun_period else float(senkou_a.iloc[-1])
    sb_current = float(senkou_b.iloc[-kijun_period]) if len(senkou_b) > kijun_period else float(senkou_b.iloc[-1])
    price = float(closes.iloc[-1])
    chikou = float(closes.iloc[-kijun_period]) if len(closes) > kijun_period else None

    cloud_top = max(sa_current, sb_current)
    cloud_bottom = min(sa_current, sb_current)
    cloud_color = "green" if sa_current >= sb_current else "red"

    if price > cloud_top:
        price_vs = "above"
    elif price < cloud_bottom:
        price_vs = "below"
    else:
        price_vs = "inside"

    # Trend: price above green cloud = strong bullish
    trend = None
    if price_vs == "above" and cloud_color == "green":
        trend = "strong_bullish"
    elif price_vs == "above":
        trend = "bullish"
    elif price_vs == "below" and cloud_color == "red":
        trend = "strong_bearish"
    elif price_vs == "below":
        trend = "bearish"
    else:
        trend = "neutral"

    # TK cross
    prev_t = float(tenkan.iloc[-2]) if len(tenkan) > 1 else t_val
    prev_k = float(kijun.iloc[-2]) if len(kijun) > 1 else k_val
    tk_cross = None
    if prev_t <= prev_k and t_val > k_val:
        tk_cross = "bullish"
    elif prev_t >= prev_k and t_val < k_val:
        tk_cross = "bearish"

    return {
        "tenkan_sen": round(t_val, 6),
        "kijun_sen": round(k_val, 6),
        "senkou_a": round(sa_current, 6),
        "senkou_b": round(sb_current, 6),
        "chikou_span": round(chikou, 6) if chikou else None,
        "cloud_color": cloud_color,
        "price_vs_cloud": price_vs,
        "trend": trend,
        "tk_cross": tk_cross,
    }
