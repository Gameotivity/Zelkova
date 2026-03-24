"""Composite strategy signals — pure math, no LLM.

Combines multiple indicators into actionable trade setups.
Each strategy function returns a StrategySignal if the pattern fires.
"""
from __future__ import annotations

from typing import Any, Optional

from hyperalpha.types import StrategySignal


def _sig(
    name: str,
    direction: str,
    strength: float,
    timeframe: str,
    description: str,
    supporting: dict,
) -> StrategySignal:
    return StrategySignal(
        name=name,
        direction=direction,
        strength=round(min(1.0, max(0.0, strength)), 2),
        timeframe=timeframe,
        description=description,
        supporting_indicators=supporting,
    )


def signal_rsi_divergence_reversal(
    ind: dict[str, Any], tf: str
) -> Optional[StrategySignal]:
    """RSI divergence + overbought/oversold = reversal signal."""
    div = ind.get("rsi_divergence")
    rsi = ind.get("rsi")
    if not div or rsi is None:
        return None

    if div.get("bearish_divergence") and rsi > 65:
        return _sig(
            "rsi_divergence_reversal", "bearish",
            0.6 + div["divergence_strength"] * 0.3, tf,
            f"Bearish RSI divergence with RSI at {rsi:.1f} (overbought zone)",
            {"rsi": rsi, "divergence": div},
        )
    if div.get("bullish_divergence") and rsi < 35:
        return _sig(
            "rsi_divergence_reversal", "bullish",
            0.6 + div["divergence_strength"] * 0.3, tf,
            f"Bullish RSI divergence with RSI at {rsi:.1f} (oversold zone)",
            {"rsi": rsi, "divergence": div},
        )
    return None


def signal_golden_death_cross(
    ind: dict[str, Any], tf: str
) -> Optional[StrategySignal]:
    """EMA50/200 crossover."""
    cross = ind.get("golden_death_cross")
    if not cross or cross.get("cross") is None:
        return None

    direction = "bullish" if cross["cross"] == "golden" else "bearish"
    return _sig(
        "golden_death_cross", direction, 0.75, tf,
        f"{'Golden' if direction == 'bullish' else 'Death'} Cross: "
        f"EMA50={cross['ema_50']:.2f} vs EMA200={cross['ema_200']:.2f}",
        cross,
    )


def signal_ema_pullback(
    ind: dict[str, Any], price: float, tf: str
) -> Optional[StrategySignal]:
    """Price pulling back to EMA20/50 in a trending market."""
    ema_20 = ind.get("ema_20")
    ema_50 = ind.get("ema_50")
    ema_200 = ind.get("ema_200")
    if ema_20 is None or ema_50 is None:
        return None

    # Bullish trend: EMA50 > EMA200 (or EMA20 > EMA50 if 200 unavailable)
    in_uptrend = (ema_50 > ema_200) if ema_200 else (ema_20 > ema_50)
    in_downtrend = (ema_50 < ema_200) if ema_200 else (ema_20 < ema_50)

    # Pullback to EMA20 in uptrend
    if in_uptrend and abs(price - ema_20) / ema_20 < 0.005:
        return _sig(
            "ema_pullback", "bullish", 0.65, tf,
            f"Price pulling back to EMA20 ({ema_20:.2f}) in uptrend",
            {"price": price, "ema_20": ema_20, "ema_50": ema_50},
        )
    if in_downtrend and abs(price - ema_20) / ema_20 < 0.005:
        return _sig(
            "ema_pullback", "bearish", 0.65, tf,
            f"Price pulling back to EMA20 ({ema_20:.2f}) in downtrend",
            {"price": price, "ema_20": ema_20, "ema_50": ema_50},
        )
    return None


def signal_macd_histogram_reversal(
    ind: dict[str, Any], tf: str
) -> Optional[StrategySignal]:
    """MACD histogram zero-cross or momentum shift."""
    rev = ind.get("macd_reversal")
    if not rev or rev.get("reversal") is None:
        return None
    return _sig(
        "macd_histogram_reversal", rev["reversal"], 0.60, tf,
        f"MACD histogram {rev['reversal']} reversal (slope: {rev['histogram_slope']:.6f})",
        rev,
    )


def signal_bollinger_squeeze_breakout(
    ind: dict[str, Any], price: float, tf: str
) -> Optional[StrategySignal]:
    """Bollinger squeeze + price breaking a band = breakout."""
    squeeze = ind.get("bollinger_squeeze")
    boll = ind.get("bollinger")
    if not squeeze or not squeeze.get("squeeze") or not boll:
        return None

    upper = boll.get("upper")
    lower = boll.get("lower")
    if upper is None or lower is None:
        return None

    if price > upper:
        return _sig(
            "bollinger_squeeze_breakout", "bullish", 0.75, tf,
            f"Bollinger squeeze breakout above upper band ({upper:.2f}), "
            f"bandwidth percentile {squeeze.get('bandwidth_percentile', 0):.0f}%",
            {"squeeze": squeeze, "bollinger": boll, "price": price},
        )
    if price < lower:
        return _sig(
            "bollinger_squeeze_breakout", "bearish", 0.75, tf,
            f"Bollinger squeeze breakout below lower band ({lower:.2f}), "
            f"bandwidth percentile {squeeze.get('bandwidth_percentile', 0):.0f}%",
            {"squeeze": squeeze, "bollinger": boll, "price": price},
        )
    return None


def signal_bollinger_mean_reversion(
    ind: dict[str, Any], price: float, tf: str
) -> Optional[StrategySignal]:
    """Price at Bollinger band + RSI extreme = mean reversion bounce."""
    boll = ind.get("bollinger")
    rsi = ind.get("rsi")
    squeeze = ind.get("bollinger_squeeze")
    if not boll or rsi is None:
        return None
    # Don't mean-revert during a squeeze (breakout likely)
    if squeeze and squeeze.get("squeeze"):
        return None

    pct_b = boll.get("pct_b")
    if pct_b is None:
        return None

    if pct_b < 0.05 and rsi < 35:
        return _sig(
            "bollinger_mean_reversion", "bullish", 0.65, tf,
            f"Price at lower Bollinger band (%B={pct_b:.2f}) with RSI={rsi:.1f}",
            {"bollinger": boll, "rsi": rsi},
        )
    if pct_b > 0.95 and rsi > 65:
        return _sig(
            "bollinger_mean_reversion", "bearish", 0.65, tf,
            f"Price at upper Bollinger band (%B={pct_b:.2f}) with RSI={rsi:.1f}",
            {"bollinger": boll, "rsi": rsi},
        )
    return None


def signal_fibonacci_confluence(
    ind: dict[str, Any], price: float, tf: str
) -> Optional[StrategySignal]:
    """Price near a key Fibonacci level (38.2%, 50%, 61.8%) + another indicator confirms."""
    fib = ind.get("fibonacci")
    if not fib or fib.get("levels") is None:
        return None

    dist = fib.get("distance_pct")
    nearest = fib.get("nearest_level", "")
    if dist is None or abs(dist) > 0.5:
        return None

    # Only signal on key levels
    key_levels = ("fib_38.2", "fib_50.0", "fib_61.8")
    if nearest not in key_levels:
        return None

    # Look for confirming indicator
    rsi = ind.get("rsi")
    ema_20 = ind.get("ema_20")
    confirming = []
    if rsi and rsi < 40:
        confirming.append(f"RSI oversold ({rsi:.1f})")
    elif rsi and rsi > 60:
        confirming.append(f"RSI overbought ({rsi:.1f})")
    if ema_20 and abs(price - ema_20) / ema_20 < 0.005:
        confirming.append(f"EMA20 confluence ({ema_20:.2f})")

    if not confirming:
        return None

    direction = "bullish" if dist < 0 else "bearish"
    return _sig(
        "fibonacci_confluence", direction, 0.70, tf,
        f"Price at {nearest} ({fib['nearest_price']:.2f}), confirming: {', '.join(confirming)}",
        {"fibonacci": fib, "rsi": rsi, "ema_20": ema_20},
    )


def signal_vwap_reclaim(
    ind: dict[str, Any], tf: str
) -> Optional[StrategySignal]:
    """VWAP reclaim/loss signal."""
    vr = ind.get("vwap_reclaim")
    if not vr or vr.get("reclaim") is None:
        return None
    direction = vr["reclaim"]
    return _sig(
        "vwap_reclaim", direction, 0.60, tf,
        f"VWAP {'reclaimed from below' if direction == 'bullish' else 'lost from above'} "
        f"(VWAP={vr['vwap']:.2f}, distance={vr['distance_pct']:.2f}%)",
        vr,
    )


def signal_ichimoku_kumo_breakout(
    ind: dict[str, Any], tf: str
) -> Optional[StrategySignal]:
    """Price breaks above/below Ichimoku cloud with TK cross confirmation."""
    ichi = ind.get("ichimoku")
    if not ichi or ichi.get("trend") is None:
        return None

    trend = ichi["trend"]
    tk = ichi.get("tk_cross")
    pos = ichi.get("price_vs_cloud")

    # Strong signal: above green cloud + bullish TK cross
    if trend == "strong_bullish" and tk == "bullish":
        return _sig(
            "ichimoku_kumo_breakout", "bullish", 0.80, tf,
            f"Price above green cloud + bullish TK cross (Tenkan={ichi['tenkan_sen']:.2f})",
            ichi,
        )
    if trend == "strong_bearish" and tk == "bearish":
        return _sig(
            "ichimoku_kumo_breakout", "bearish", 0.80, tf,
            f"Price below red cloud + bearish TK cross (Tenkan={ichi['tenkan_sen']:.2f})",
            ichi,
        )
    # Weaker: just above/below cloud without TK cross
    if pos == "above" and trend in ("bullish", "strong_bullish"):
        return _sig(
            "ichimoku_kumo_breakout", "bullish", 0.55, tf,
            f"Price above Ichimoku cloud ({ichi['cloud_color']})",
            ichi,
        )
    if pos == "below" and trend in ("bearish", "strong_bearish"):
        return _sig(
            "ichimoku_kumo_breakout", "bearish", 0.55, tf,
            f"Price below Ichimoku cloud ({ichi['cloud_color']})",
            ichi,
        )
    return None


def signal_stochastic_rsi_confirmation(
    ind: dict[str, Any], tf: str
) -> Optional[StrategySignal]:
    """Both Stochastic and RSI agree on overbought/oversold."""
    stoch = ind.get("stochastic")
    rsi = ind.get("rsi")
    if not stoch or rsi is None or stoch.get("k") is None:
        return None

    if stoch["oversold"] and rsi < 30:
        return _sig(
            "stochastic_rsi_confirmation", "bullish", 0.70, tf,
            f"Stochastic oversold (K={stoch['k']:.1f}) + RSI oversold ({rsi:.1f})",
            {"stochastic": stoch, "rsi": rsi},
        )
    if stoch["overbought"] and rsi > 70:
        return _sig(
            "stochastic_rsi_confirmation", "bearish", 0.70, tf,
            f"Stochastic overbought (K={stoch['k']:.1f}) + RSI overbought ({rsi:.1f})",
            {"stochastic": stoch, "rsi": rsi},
        )
    return None


def signal_chandelier_exit(
    ind: dict[str, Any], tf: str
) -> Optional[StrategySignal]:
    """ATR trailing stop levels for position management."""
    ch = ind.get("chandelier_exit")
    if not ch or ch.get("signal") is None:
        return None
    direction = "bullish" if ch["signal"] == "long" else "bearish"
    return _sig(
        "chandelier_exit", direction, 0.50, tf,
        f"Chandelier exit: {'hold long' if ch['signal'] == 'long' else 'hold short'} "
        f"(long_stop={ch['long_stop']:.2f}, short_stop={ch['short_stop']:.2f})",
        ch,
    )


# ─── Main entry point ──────────────────────────

_ALL_SIGNALS = [
    signal_rsi_divergence_reversal,
    signal_golden_death_cross,
    signal_macd_histogram_reversal,
    signal_bollinger_squeeze_breakout,
    signal_bollinger_mean_reversion,
    signal_fibonacci_confluence,
    signal_vwap_reclaim,
    signal_ichimoku_kumo_breakout,
    signal_stochastic_rsi_confirmation,
    signal_chandelier_exit,
]

_PRICE_SIGNALS = [
    signal_ema_pullback,
    signal_bollinger_squeeze_breakout,
    signal_bollinger_mean_reversion,
    signal_fibonacci_confluence,
]


def compute_strategy_signals(
    indicators_1h: dict[str, Any],
    indicators_4h: dict[str, Any],
    price: float,
) -> list[StrategySignal]:
    """Run all strategy signal detectors on both timeframes."""
    signals: list[StrategySignal] = []

    for tf_label, ind in [("1h", indicators_1h), ("4h", indicators_4h)]:
        if not ind or ind.get("data_quality", 0) == 0:
            continue

        # Signals that don't need price
        for fn in [
            signal_rsi_divergence_reversal,
            signal_golden_death_cross,
            signal_macd_histogram_reversal,
            signal_vwap_reclaim,
            signal_ichimoku_kumo_breakout,
            signal_stochastic_rsi_confirmation,
            signal_chandelier_exit,
        ]:
            result = fn(ind, tf_label)
            if result is not None:
                signals.append(result)

        # Signals that need price
        for fn in [
            signal_ema_pullback,
            signal_bollinger_squeeze_breakout,
            signal_bollinger_mean_reversion,
            signal_fibonacci_confluence,
        ]:
            result = fn(ind, price, tf_label)
            if result is not None:
                signals.append(result)

    return signals
