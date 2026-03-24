"""HyperAlpha Layer 2 — Technical Analyst (indicators + strategy signals)."""
from __future__ import annotations

from typing import Any

import structlog
from langchain_core.messages import SystemMessage, HumanMessage

from hyperalpha.types import AnalystReport, HyperAlphaState, StrategySignal
from hyperalpha.indicators import compute_all_indicators
from hyperalpha.agents.strategy_signals import compute_strategy_signals
from hyperalpha.agents._helpers import neutral_fallback, parse_signal, parse_confidence, build_llm

log = structlog.get_logger(__name__)

TECHNICALS_SYSTEM = """You are a quantitative technical analyst for Hyperliquid perpetual contracts. \
You interpret pre-computed indicators AND strategy signals to produce a directional trading signal.

INDICATOR INTERPRETATION:
- RSI: <30 oversold (buy zone), >70 overbought (sell zone), 40-60 neutral
- RSI Divergence: bearish div at highs = reversal warning, bullish div at lows = bounce likely
- MACD: histogram > 0 and rising = bullish momentum; < 0 and falling = bearish
- MACD Reversal: histogram zero-cross = momentum shift
- Stochastic: <20 oversold, >80 overbought. Best with RSI double confirmation
- Bollinger %B: <0 = below lower band (oversold), >1 = above upper band (overbought)
- Bollinger Squeeze: tight bandwidth = explosive move loading; trade the breakout direction
- EMA: price > EMA200 = long-term bullish; EMA20 > EMA50 > EMA200 = strong trend
- Golden Cross: EMA50 crosses above EMA200 = major bullish signal
- Death Cross: EMA50 crosses below EMA200 = major bearish signal
- Ichimoku: price above green cloud + bullish TK cross = strongest buy signal
- Fibonacci: 61.8% retracement + indicator confluence = highest probability entry
- VWAP: price > VWAP = intraday bullish bias; VWAP reclaim = institutional buying
- ATR: use for stop-loss/take-profit sizing (1.5x ATR stop, 2-3x ATR target)
- Chandelier Exit: ATR trailing stop levels for trend following

STAT-ARB METRICS:
- Z-score: |z| > 2 = extreme deviation (mean reversion opportunity)
- Hurst < 0.5 = mean-reverting (fade moves), > 0.5 = trending (follow moves)
- Half-life: expected candles until mean reversion (shorter = faster reversion)

STRATEGY SIGNALS:
Strategy signals are pre-computed composite patterns. When a signal fires, it means \
multiple indicators align. Weight fired strategy signals heavily — they represent confluence.
4h signals should be weighted 2x over 1h signals.

OUTPUT FORMAT (strict):
SIGNAL: STRONG_BUY | BUY | NEUTRAL | SELL | STRONG_SELL
CONFIDENCE: 0.0-1.0
REASONING: <2-3 sentences on technical setup>"""


def _extract_candles(candles_raw: list[dict], interval: str) -> list[dict]:
    """Extract candle data for a specific interval from nested structure."""
    for entry in candles_raw:
        if isinstance(entry, dict) and entry.get("interval") == interval:
            return entry.get("data", [])
    return []


def _format_indicators(ind: dict[str, Any], label: str) -> str:
    """Format indicators dict into readable text for the LLM prompt."""
    lines = [f"\n--- {label} INDICATORS ({ind.get('candle_count', 0)} candles) ---"]
    lines.append(f"RSI(14): {ind.get('rsi', 'N/A')}")

    div = ind.get("rsi_divergence", {})
    if div.get("bullish_divergence") or div.get("bearish_divergence"):
        lines.append(f"RSI Divergence: {'BEARISH' if div.get('bearish_divergence') else 'BULLISH'} (strength={div.get('divergence_strength', 0):.2f})")

    lines.append(f"MACD: {ind.get('macd', 'N/A')}")
    rev = ind.get("macd_reversal", {})
    if rev.get("reversal"):
        lines.append(f"MACD Reversal: {rev['reversal']} (slope={rev.get('histogram_slope', 0):.6f})")

    stoch = ind.get("stochastic")
    if stoch and stoch.get("k") is not None:
        lines.append(f"Stochastic: K={stoch['k']}, D={stoch['d']} {'(OVERSOLD)' if stoch.get('oversold') else '(OVERBOUGHT)' if stoch.get('overbought') else ''}")

    lines.append(f"Bollinger Bands: {ind.get('bollinger', 'N/A')}")
    sq = ind.get("bollinger_squeeze", {})
    if sq.get("squeeze"):
        lines.append(f"BOLLINGER SQUEEZE DETECTED (bandwidth percentile={sq.get('bandwidth_percentile', 0):.0f}%)")

    lines.append(f"ATR(14): {ind.get('atr', 'N/A')}")
    ch = ind.get("chandelier_exit", {})
    if ch.get("signal"):
        lines.append(f"Chandelier Exit: {ch['signal']} (long_stop={ch.get('long_stop')}, short_stop={ch.get('short_stop')})")

    for p in (20, 50, 200):
        val = ind.get(f"ema_{p}")
        if val is not None:
            lines.append(f"EMA({p}): {val}")

    cross = ind.get("golden_death_cross", {})
    if cross.get("cross"):
        lines.append(f"{'GOLDEN' if cross['cross'] == 'golden' else 'DEATH'} CROSS detected (distance={cross.get('distance_pct', 0):.2f}%)")

    ichi = ind.get("ichimoku")
    if ichi and ichi.get("trend"):
        lines.append(f"Ichimoku: trend={ichi['trend']}, cloud={ichi['cloud_color']}, price {ichi['price_vs_cloud']} cloud" + (f", TK cross={ichi['tk_cross']}" if ichi.get("tk_cross") else ""))

    lines.append(f"VWAP: {ind.get('vwap', 'N/A')}")
    vr = ind.get("vwap_reclaim", {})
    if vr.get("reclaim"):
        lines.append(f"VWAP {vr['reclaim']} signal (distance={vr.get('distance_pct', 0):.2f}%)")

    fib = ind.get("fibonacci", {})
    if fib and fib.get("nearest_level"):
        lines.append(f"Fibonacci: nearest={fib['nearest_level']} ({fib.get('nearest_price', 0):.2f}), distance={fib.get('distance_pct', 0):.2f}%")

    lines.append(f"\nZ-Score(60): {ind.get('z_score', 'N/A')}")
    lines.append(f"Hurst Exponent: {ind.get('hurst_exponent', 'N/A')}")
    lines.append(f"Half-Life: {ind.get('half_life', 'N/A')} candles")
    return "\n".join(lines)


def _format_strategy_signals(signals: list[StrategySignal]) -> str:
    """Format fired strategy signals for the LLM prompt."""
    if not signals:
        return "\n--- STRATEGY SIGNALS ---\nNo strategy signals fired."
    lines = ["\n--- STRATEGY SIGNALS (CONFLUENCE PATTERNS) ---"]
    for s in signals:
        icon = "BULL" if s.direction == "bullish" else "BEAR"
        lines.append(f"[{icon}] {s.name} ({s.timeframe}, strength={s.strength:.0%}): {s.description}")
    return "\n".join(lines)


async def analyze_technicals(state: HyperAlphaState) -> dict[str, Any]:
    """Compute indicators on 1h + 4h, run strategy signals, then LLM interprets."""
    ticker = state["ticker"]
    md = state.get("market_data", {})
    agent_name = "technicals_analyst"
    mid_price = md.get("mid_price", 0)
    candles_raw = md.get("candles", [])

    candles_1h = _extract_candles(candles_raw, "1h")
    candles_4h = _extract_candles(candles_raw, "4h")

    if not candles_1h and not candles_4h:
        log.warning("technicals.no_candles", ticker=ticker)
        return {"technicals_report": neutral_fallback(agent_name, ticker, "No candle data"), "strategy_signals": []}

    # Compute indicators for both timeframes
    ind_1h = compute_all_indicators(candles_1h) if candles_1h else {}
    ind_4h = compute_all_indicators(candles_4h) if candles_4h else {}

    # Compute strategy signals
    strategy_sigs = compute_strategy_signals(ind_1h, ind_4h, mid_price)

    # Use best data quality
    quality_1h = ind_1h.get("data_quality", 0.0)
    quality_4h = ind_4h.get("data_quality", 0.0)
    indicator_quality = max(quality_1h, quality_4h)

    # Build LLM prompt with both timeframes
    prompt_data = f"Ticker: {ticker}\nCurrent Price: ${mid_price:,.2f}\n"
    if ind_1h:
        prompt_data += _format_indicators(ind_1h, "1H")
    if ind_4h:
        prompt_data += _format_indicators(ind_4h, "4H")
    prompt_data += _format_strategy_signals(strategy_sigs)

    try:
        llm = build_llm(temperature=0.1, max_tokens=1200)
        response = await llm.ainvoke([SystemMessage(content=TECHNICALS_SYSTEM), HumanMessage(content=prompt_data)])
        text = response.content
        assert isinstance(text, str)
    except Exception as exc:
        log.error("technicals.llm_error", ticker=ticker, error=str(exc))
        return {"technicals_report": neutral_fallback(agent_name, ticker, f"LLM error: {exc}"), "strategy_signals": strategy_sigs}

    # Merge indicators into key_metrics
    key_metrics = {k: v for k, v in ind_1h.items() if k != "data_quality"}
    key_metrics["indicators_4h"] = {k: v for k, v in ind_4h.items() if k != "data_quality"}

    report = AnalystReport(
        agent_name=agent_name, ticker=ticker,
        signal=parse_signal(text), confidence=parse_confidence(text),
        reasoning=text, key_metrics=key_metrics, data_quality=indicator_quality,
    )

    log.info(
        "technicals.complete", ticker=ticker, signal=report.signal.value,
        confidence=report.confidence, data_quality=indicator_quality,
        strategy_signals_fired=len(strategy_sigs),
        rsi=ind_1h.get("rsi"), z_score=ind_1h.get("z_score"), hurst=ind_1h.get("hurst_exponent"),
    )
    return {"technicals_report": report, "strategy_signals": strategy_sigs}
