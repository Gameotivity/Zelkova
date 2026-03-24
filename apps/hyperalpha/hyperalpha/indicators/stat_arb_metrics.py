"""Stat-arb metrics: Z-score, Hurst Exponent, Half-Life."""
from __future__ import annotations

import math

import numpy as np
import pandas as pd


def compute_z_score(series: pd.Series, lookback: int = 60) -> float:
    if len(series) < lookback:
        return float("nan")
    window = series.iloc[-lookback:]
    mean = window.mean()
    std = window.std()
    if std == 0 or pd.isna(std):
        return 0.0
    return round(float((series.iloc[-1] - mean) / std), 4)


def compute_hurst(series: pd.Series, max_lag: int = 20) -> float:
    """Estimate Hurst exponent via rescaled range (R/S) method.
    H < 0.5 = mean-reverting, H ~ 0.5 = random walk, H > 0.5 = trending.
    """
    arr = series.dropna().values
    if len(arr) < max_lag * 2:
        return float("nan")

    lags = range(2, max_lag + 1)
    rs_values: list[float] = []

    for lag in lags:
        chunks = [arr[i : i + lag] for i in range(0, len(arr) - lag + 1, lag)]
        rs_per_chunk: list[float] = []
        for chunk in chunks:
            if len(chunk) < 2:
                continue
            mean_c = np.mean(chunk)
            deviations = chunk - mean_c
            cumdev = np.cumsum(deviations)
            r = float(np.max(cumdev) - np.min(cumdev))
            s = float(np.std(chunk, ddof=1))
            if s > 0:
                rs_per_chunk.append(r / s)
        if rs_per_chunk:
            rs_values.append(np.mean(rs_per_chunk))
        else:
            rs_values.append(float("nan"))

    valid = [(lag, rs) for lag, rs in zip(lags, rs_values) if not math.isnan(rs) and rs > 0]
    if len(valid) < 3:
        return float("nan")

    log_lags = np.log([v[0] for v in valid])
    log_rs = np.log([v[1] for v in valid])
    poly = np.polyfit(log_lags, log_rs, 1)
    return round(float(poly[0]), 4)


def compute_half_life(series: pd.Series) -> float:
    """Estimate mean-reversion half-life via OLS on lagged spread."""
    arr = series.dropna().values
    if len(arr) < 10:
        return float("nan")
    y = np.diff(arr)
    x = arr[:-1]
    x_with_const = np.column_stack([x, np.ones(len(x))])
    try:
        result = np.linalg.lstsq(x_with_const, y, rcond=None)
        beta = result[0][0]
    except np.linalg.LinAlgError:
        return float("nan")
    if beta >= 0:
        return float("nan")
    half_life = -math.log(2) / beta
    return round(float(half_life), 2)
