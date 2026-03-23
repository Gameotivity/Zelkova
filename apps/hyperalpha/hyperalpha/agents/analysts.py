"""
HyperAlpha Layer 2 — Analyst Agents.

Four specialist analysts that run in parallel to evaluate a ticker:
  1. Fundamentals (funding rates, OI, volume, spreads)
  2. Sentiment (social, volume profile, market regime)
  3. Technical (RSI, MACD, Bollinger, ATR, VWAP, stat-arb metrics)
  4. Macro (BTC dominance, DXY proxy, ETF flows, stablecoin supply)

Each analyst returns an AnalystReport with signal, confidence, reasoning,
key_metrics, and data_quality.
"""
from __future__ import annotations

import math
from typing import Any

import numpy as np
import pandas as pd
import structlog
from langchain_anthropic import ChatAnthropic
from langchain_core.messages import HumanMessage, SystemMessage

from hyperalpha.config import settings
from hyperalpha.types import AnalystReport, Signal, HyperAlphaState

log = structlog.get_logger(__name__)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

MIN_CANDLES_RSI = 14
MIN_CANDLES_MACD = 26
MIN_CANDLES_BOLLINGER = 20
MIN_CANDLES_ATR = 14
MIN_CANDLES_VWAP = 1


def _neutral_fallback(agent_name: str, ticker: str, reason: str) -> AnalystReport:
    """Return a safe NEUTRAL report when analysis cannot be performed."""
    return AnalystReport(
        agent_name=agent_name,
        ticker=ticker,
        signal=Signal.NEUTRAL,
        confidence=0.0,
        reasoning=f"Analysis unavailable: {reason}",
        key_metrics={},
        data_quality=0.0,
    )


def _parse_signal(text: str) -> Signal:
    """Parse a SIGNAL: line from LLM output into a Signal enum.

    Searches for an explicit ``SIGNAL: <value>`` line first, then falls back
    to keyword scanning.  Returns NEUTRAL if nothing matches.
    """
    upper = text.upper()

    # Explicit SIGNAL: line takes priority
    for line in upper.splitlines():
        stripped = line.strip()
        if stripped.startswith("SIGNAL:"):
            value = stripped.split(":", 1)[1].strip()
            if "STRONG_BUY" in value or "STRONG BUY" in value:
                return Signal.STRONG_BUY
            elif "STRONG_SELL" in value or "STRONG SELL" in value:
                return Signal.STRONG_SELL
            elif "BUY" in value:
                return Signal.BUY
            elif "SELL" in value:
                return Signal.SELL
            elif "NEUTRAL" in value:
                return Signal.NEUTRAL

    # Fallback: keyword scan (ordered most-specific first)
    if "STRONG_BUY" in upper or "STRONG BUY" in upper:
        return Signal.STRONG_BUY
    elif "STRONG_SELL" in upper or "STRONG SELL" in upper:
        return Signal.STRONG_SELL
    elif "BUY" in upper:
        return Signal.BUY
    elif "SELL" in upper:
        return Signal.SELL

    return Signal.NEUTRAL


def _parse_confidence(text: str) -> float:
    """Extract CONFIDENCE: <float> from LLM output, default 0.5."""
    upper = text.upper()
    for line in upper.splitlines():
        stripped = line.strip()
        if stripped.startswith("CONFIDENCE:"):
            try:
                val = float(stripped.split(":", 1)[1].strip())
                return max(0.0, min(1.0, val))
            except (ValueError, IndexError):
                pass
    return 0.5


def _build_llm(temperature: float, max_tokens: int) -> ChatAnthropic:
    """Construct a ChatAnthropic instance with standard settings."""
    return ChatAnthropic(
        model=settings.quick_think_model,
        anthropic_api_key=settings.anthropic_api_key,
        temperature=temperature,
        max_tokens=max_tokens,
        timeout=settings.llm_timeout_seconds,
        max_retries=settings.llm_max_retries,
    )


# ---------------------------------------------------------------------------
# 1. Fundamentals Analyst
# ---------------------------------------------------------------------------

FUNDAMENTALS_SYSTEM = """You are a senior crypto fundamentals analyst on a Hyperliquid-focused \
trading desk. You evaluate on-chain and exchange-level fundamentals for perpetual contracts.

ANALYSIS FRAMEWORK:
1. Funding Rate Assessment
   - Current vs 8h average vs 24h average
   - Thresholds: >0.05% = extreme positive (crowded long), <-0.05% = extreme negative (crowded short)
   - 0.01%-0.03% = moderately bullish, -0.03% to -0.01% = moderately bearish
   - Near 0% = neutral / balanced

2. Open Interest + Price Matrix
   - OI rising + price rising = new longs entering (bullish trend confirmation)
   - OI rising + price falling = new shorts entering (bearish trend confirmation)
   - OI falling + price rising = short covering rally (weak bullish, may reverse)
   - OI falling + price falling = long liquidation cascade (capitulation, watch for bottom)

3. Volume Analysis
   - Compare current volume to 24h average; >1.5x = elevated, >3x = extreme
   - Volume confirmation: strong moves on high volume are more reliable

4. Bid-Ask Spread
   - Tight spread (<0.05%) = healthy liquidity
   - Wide spread (>0.15%) = thin book, higher slippage risk

OUTPUT FORMAT (strict):
SIGNAL: STRONG_BUY | BUY | NEUTRAL | SELL | STRONG_SELL
CONFIDENCE: 0.0-1.0
REASONING: <2-3 sentences explaining the key fundamental drivers>
KEY_FACTORS: <comma-separated list of the top 3 factors>"""


async def analyze_fundamentals(state: HyperAlphaState) -> dict[str, Any]:
    """Run fundamentals analysis on the ticker's market data."""
    ticker = state["ticker"]
    md = state.get("market_data", {})
    agent_name = "fundamentals_analyst"

    # Extract flat market data fields
    mid_price = md.get("mid_price", 0)
    funding_rate = md.get("funding_rate", 0)
    open_interest = md.get("open_interest", 0)
    volume_24h = md.get("volume_24h", 0)
    price_change = md.get("price_change_24h_pct", 0)
    spread_bps = md.get("spread_bps", 0)
    book_imbalance = md.get("order_book_imbalance", 0)

    data_quality = 1.0 if mid_price > 0 else 0.0

    if mid_price == 0:
        log.warning("fundamentals.no_data", ticker=ticker)
        return {"fundamentals_report": _neutral_fallback(agent_name, ticker, "No market data")}

    prompt_data = (
        f"Ticker: {ticker}\n"
        f"Current Price: ${mid_price:,.2f}\n"
        f"Funding Rate (8h): {funding_rate:.6f} ({funding_rate * 3 * 365 * 100:.1f}% annualized)\n"
        f"Open Interest: ${open_interest:,.0f}\n"
        f"Volume (24h): ${volume_24h:,.0f}\n"
        f"24h Price Change: {price_change:.2f}%\n"
        f"Spread (bps): {spread_bps:.1f}\n"
        f"Order Book Imbalance: {book_imbalance:.3f} (-1=ask heavy, +1=bid heavy)"
    )

    try:
        llm = _build_llm(temperature=0.2, max_tokens=1000)
        response = await llm.ainvoke([
            SystemMessage(content=FUNDAMENTALS_SYSTEM),
            HumanMessage(content=prompt_data),
        ])
        text = response.content
        assert isinstance(text, str)
    except Exception as exc:
        log.error("fundamentals.llm_error", ticker=ticker, error=str(exc))
        return {"fundamentals_report": _neutral_fallback(agent_name, ticker, f"LLM error: {exc}")}

    signal = _parse_signal(text)
    confidence = _parse_confidence(text)

    report = AnalystReport(
        agent_name=agent_name,
        ticker=ticker,
        signal=signal,
        confidence=confidence,
        reasoning=text,
        key_metrics={
            "funding_rate": funding_rate,
            "open_interest": open_interest,
            "volume_24h": volume_24h,
        },
        data_quality=data_quality,
    )

    log.info(
        "fundamentals.complete",
        ticker=ticker,
        signal=signal.value,
        confidence=confidence,
        data_quality=data_quality,
    )
    return {"fundamentals_report": report}


# ---------------------------------------------------------------------------
# 2. Sentiment Analyst
# ---------------------------------------------------------------------------

SENTIMENT_SYSTEM = """You are a crypto sentiment analyst specializing in Hyperliquid perpetuals. \
You interpret volume profiles, social signals, and market microstructure to gauge crowd positioning.

ANALYSIS FRAMEWORK:
1. Volume Profile
   - Buy/sell volume ratio: >1.3 = bullish pressure, <0.7 = bearish pressure
   - Volume exhaustion heuristic: if price makes new high/low on declining volume, \
the move is losing momentum and may reverse

2. Liquidation Analysis
   - Large long liquidations = forced selling (potential bottom if exhausted)
   - Large short liquidations = forced buying (potential top if exhausted)
   - Cascading liquidations = trend acceleration, do NOT fade

3. Market Regime Classification
   Output one of:
   - TRENDING_UP: clear higher highs, higher lows, volume confirming
   - TRENDING_DOWN: lower highs, lower lows, volume confirming
   - RANGING: no clear direction, mean-reverting behavior
   - VOLATILE_BREAKOUT: expanding range, high volume, directional
   - CAPITULATION: extreme selling, volume spike, potential bottom

4. Quantitative Thresholds
   - Funding > 0.05%: sentiment too bullish (contrarian sell signal)
   - Funding < -0.05%: sentiment too bearish (contrarian buy signal)
   - OI change > 10% in 24h: significant new positioning

OUTPUT FORMAT (strict):
SIGNAL: STRONG_BUY | BUY | NEUTRAL | SELL | STRONG_SELL
CONFIDENCE: 0.0-1.0
REGIME: TRENDING_UP | TRENDING_DOWN | RANGING | VOLATILE_BREAKOUT | CAPITULATION
REASONING: <2-3 sentences on sentiment drivers>"""


async def analyze_sentiment(state: HyperAlphaState) -> dict[str, Any]:
    """Run sentiment analysis on volume, liquidation, and social data."""
    ticker = state["ticker"]
    md = state.get("market_data", {})
    agent_name = "sentiment_analyst"

    mid_price = md.get("mid_price", 0)
    funding_rate = md.get("funding_rate", 0)
    volume_24h = md.get("volume_24h", 0)
    open_interest = md.get("open_interest", 0)
    price_change = md.get("price_change_24h_pct", 0)
    book_imbalance = md.get("order_book_imbalance", 0)

    data_quality = 1.0 if mid_price > 0 else 0.0

    if mid_price == 0:
        log.warning("sentiment.no_data", ticker=ticker)
        return {"sentiment_report": _neutral_fallback(agent_name, ticker, "No market data")}

    prompt_data = (
        f"Ticker: {ticker}\n"
        f"Current Price: ${mid_price:,.2f}\n"
        f"24h Price Change: {price_change:.2f}%\n"
        f"Volume (24h): ${volume_24h:,.0f}\n"
        f"Funding Rate (8h): {funding_rate:.6f}\n"
        f"Open Interest: ${open_interest:,.0f}\n"
        f"Order Book Imbalance: {book_imbalance:.3f} (-1=ask heavy, +1=bid heavy)\n"
        f"Note: Social/liquidation data not available — use price action and funding as sentiment proxy"
    )

    try:
        llm = _build_llm(temperature=0.3, max_tokens=1000)
        response = await llm.ainvoke([
            SystemMessage(content=SENTIMENT_SYSTEM),
            HumanMessage(content=prompt_data),
        ])
        text = response.content
        assert isinstance(text, str)
    except Exception as exc:
        log.error("sentiment.llm_error", ticker=ticker, error=str(exc))
        return {"sentiment_report": _neutral_fallback(agent_name, ticker, f"LLM error: {exc}")}

    signal = _parse_signal(text)
    confidence = _parse_confidence(text)

    # Extract regime
    regime = "UNKNOWN"
    for line in text.upper().splitlines():
        stripped = line.strip()
        if stripped.startswith("REGIME:"):
            regime = stripped.split(":", 1)[1].strip()
            break

    report = AnalystReport(
        agent_name=agent_name,
        ticker=ticker,
        signal=signal,
        confidence=confidence,
        reasoning=text,
        key_metrics={
            "regime": regime,
            "funding_rate": funding_rate,
        },
        data_quality=data_quality,
    )

    log.info(
        "sentiment.complete",
        ticker=ticker,
        signal=signal.value,
        confidence=confidence,
        regime=regime,
    )
    return {"sentiment_report": report}


# ---------------------------------------------------------------------------
# 3. Technical Analyst — Indicators + LLM Interpretation
# ---------------------------------------------------------------------------

def _compute_rsi(closes: pd.Series, period: int = 14) -> float:
    """Compute RSI with explicit NaN handling. Returns NaN if insufficient data."""
    if len(closes) < period + 1:
        return float("nan")

    delta = closes.diff()
    gain = delta.clip(lower=0.0)
    loss = -delta.clip(upper=0.0)

    avg_gain = gain.rolling(window=period, min_periods=period).mean()
    avg_loss = loss.rolling(window=period, min_periods=period).mean()

    last_avg_gain = avg_gain.iloc[-1]
    last_avg_loss = avg_loss.iloc[-1]

    if pd.isna(last_avg_gain) or pd.isna(last_avg_loss):
        return float("nan")
    if last_avg_loss == 0:
        return 100.0

    rs = last_avg_gain / last_avg_loss
    return 100.0 - (100.0 / (1.0 + rs))


def _compute_macd(
    closes: pd.Series,
    fast: int = 12,
    slow: int = 26,
    signal_period: int = 9,
) -> dict[str, float]:
    """Compute MACD line, signal line, and histogram."""
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


def _compute_bollinger(
    closes: pd.Series, period: int = 20, num_std: float = 2.0
) -> dict[str, float]:
    """Compute Bollinger Bands (upper, middle, lower, %B)."""
    if len(closes) < period:
        return {
            "upper": float("nan"),
            "middle": float("nan"),
            "lower": float("nan"),
            "pct_b": float("nan"),
        }

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


def _compute_atr(
    highs: pd.Series, lows: pd.Series, closes: pd.Series, period: int = 14
) -> float:
    """Compute Average True Range."""
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


def _compute_vwap(
    highs: pd.Series, lows: pd.Series, closes: pd.Series, volumes: pd.Series
) -> float:
    """Compute session VWAP."""
    if len(closes) < MIN_CANDLES_VWAP or volumes.sum() == 0:
        return float("nan")

    typical_price = (highs + lows + closes) / 3.0
    cum_tp_vol = (typical_price * volumes).cumsum()
    cum_vol = volumes.cumsum()
    vwap_series = cum_tp_vol / cum_vol
    val = vwap_series.iloc[-1]
    return float("nan") if pd.isna(val) else round(float(val), 6)


# Stat-arb helpers

def _compute_z_score(series: pd.Series, lookback: int = 60) -> float:
    """Z-score of latest value vs rolling mean/std."""
    if len(series) < lookback:
        return float("nan")
    window = series.iloc[-lookback:]
    mean = window.mean()
    std = window.std()
    if std == 0 or pd.isna(std):
        return 0.0
    return round(float((series.iloc[-1] - mean) / std), 4)


def _compute_hurst(series: pd.Series, max_lag: int = 20) -> float:
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


def _compute_half_life(series: pd.Series) -> float:
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
        return float("nan")  # not mean-reverting

    half_life = -math.log(2) / beta
    return round(float(half_life), 2)


def compute_all_indicators(candles: list[dict]) -> dict[str, Any]:
    """Compute all technical indicators + stat-arb metrics from candle data.

    Returns a dict with indicator values and a data_quality score.
    """
    if not candles:
        return {"data_quality": 0.0, "error": "No candle data"}

    df = pd.DataFrame(candles)

    # Normalize column names
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
    df = df.rename(columns=col_map)

    required = {"close"}
    if not required.issubset(set(df.columns)):
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
    total = 7  # RSI, MACD, Bollinger, ATR, VWAP, z-score, hurst

    # RSI
    if n >= MIN_CANDLES_RSI + 1:
        rsi = _compute_rsi(closes)
        indicators["rsi"] = rsi if not math.isnan(rsi) else None
        if indicators["rsi"] is not None:
            computed += 1
    else:
        indicators["rsi"] = None
        indicators["rsi_skip_reason"] = f"Need {MIN_CANDLES_RSI + 1} candles, have {n}"

    # MACD
    if n >= MIN_CANDLES_MACD + 9:
        macd = _compute_macd(closes)
        indicators["macd"] = macd
        if not math.isnan(macd["macd"]):
            computed += 1
    else:
        indicators["macd"] = None
        indicators["macd_skip_reason"] = f"Need {MIN_CANDLES_MACD + 9} candles, have {n}"

    # Bollinger
    if n >= MIN_CANDLES_BOLLINGER:
        boll = _compute_bollinger(closes)
        indicators["bollinger"] = boll
        if not math.isnan(boll["upper"]):
            computed += 1
    else:
        indicators["bollinger"] = None
        indicators["bollinger_skip_reason"] = f"Need {MIN_CANDLES_BOLLINGER} candles, have {n}"

    # ATR
    if n >= MIN_CANDLES_ATR + 1:
        atr = _compute_atr(highs, lows, closes)
        indicators["atr"] = atr if not math.isnan(atr) else None
        if indicators["atr"] is not None:
            computed += 1
    else:
        indicators["atr"] = None
        indicators["atr_skip_reason"] = f"Need {MIN_CANDLES_ATR + 1} candles, have {n}"

    # VWAP
    if volumes.sum() > 0 and n >= MIN_CANDLES_VWAP:
        vwap = _compute_vwap(highs, lows, closes, volumes)
        indicators["vwap"] = vwap if not math.isnan(vwap) else None
        if indicators["vwap"] is not None:
            computed += 1
    else:
        indicators["vwap"] = None

    # Z-score
    z = _compute_z_score(closes)
    indicators["z_score"] = z if not math.isnan(z) else None
    if indicators["z_score"] is not None:
        computed += 1

    # Hurst exponent
    hurst = _compute_hurst(closes)
    indicators["hurst_exponent"] = hurst if not math.isnan(hurst) else None
    if indicators["hurst_exponent"] is not None:
        computed += 1

    # Half-life
    hl = _compute_half_life(closes)
    indicators["half_life"] = hl if not math.isnan(hl) else None

    indicators["data_quality"] = round(computed / total, 2) if total > 0 else 0.0
    return indicators


TECHNICALS_SYSTEM = """You are a quantitative technical analyst for Hyperliquid perpetual contracts. \
You interpret pre-computed indicators to produce a directional trading signal.

INDICATOR INTERPRETATION:
- RSI: <30 oversold (buy zone), >70 overbought (sell zone), 40-60 neutral
- MACD: histogram > 0 and rising = bullish momentum; < 0 and falling = bearish
- Bollinger %B: <0 = below lower band (oversold), >1 = above upper band (overbought)
- ATR: use for stop-loss/take-profit sizing (1.5x ATR stop, 2-3x ATR target)
- VWAP: price > VWAP = intraday bullish bias, price < VWAP = bearish bias

STAT-ARB METRICS:
- Z-score: |z| > 2 = extreme deviation (mean reversion opportunity)
- Hurst < 0.5 = mean-reverting (fade moves), > 0.5 = trending (follow moves)
- Half-life: expected candles until mean reversion (shorter = faster reversion)

TIMEFRAME CONFLICT RESOLUTION:
- When 4h and 1h signals conflict, weight 4h signals 2x over 1h
- When daily and 4h conflict, weight daily 2x over 4h
- Only take high-conviction trades when multiple timeframes align

OUTPUT FORMAT (strict):
SIGNAL: STRONG_BUY | BUY | NEUTRAL | SELL | STRONG_SELL
CONFIDENCE: 0.0-1.0
ENTRY: <suggested entry price or "market">
STOP_LOSS: <price level, e.g. based on ATR>
TAKE_PROFIT: <price level, e.g. 2-3x ATR from entry>
REASONING: <2-3 sentences on technical setup>

EXAMPLE OUTPUT:
SIGNAL: BUY
CONFIDENCE: 0.72
ENTRY: 3450.50
STOP_LOSS: 3380.00 (1.5x ATR below entry)
TAKE_PROFIT: 3590.00 (2x ATR above entry)
REASONING: RSI at 38 recovering from oversold with bullish MACD crossover. \
Price reclaiming VWAP with expanding volume. Hurst 0.45 suggests mean-reversion, \
supporting the bounce thesis."""


async def analyze_technicals(state: HyperAlphaState) -> dict[str, Any]:
    """Compute indicators then ask LLM to interpret them."""
    ticker = state["ticker"]
    md = state.get("market_data", {})
    agent_name = "technicals_analyst"

    candles = md.get("candles", [])
    mid_price = md.get("mid_price", 0)

    if not candles:
        log.warning("technicals.no_candles", ticker=ticker)
        return {"technicals_report": _neutral_fallback(agent_name, ticker, "No candle data")}

    indicators = compute_all_indicators(candles)
    indicator_quality = indicators.get("data_quality", 0.0)

    prompt_data = (
        f"Ticker: {ticker}\n"
        f"Current Price: ${mid_price:,.2f}\n"
        f"Candle Count: {indicators.get('candle_count', 0)}\n"
        f"\n--- INDICATORS ---\n"
        f"RSI(14): {indicators.get('rsi', 'N/A')}\n"
        f"MACD: {indicators.get('macd', 'N/A')}\n"
        f"Bollinger Bands: {indicators.get('bollinger', 'N/A')}\n"
        f"ATR(14): {indicators.get('atr', 'N/A')}\n"
        f"VWAP: {indicators.get('vwap', 'N/A')}\n"
        f"\n--- STAT-ARB METRICS ---\n"
        f"Z-Score(60): {indicators.get('z_score', 'N/A')}\n"
        f"Hurst Exponent: {indicators.get('hurst_exponent', 'N/A')}\n"
        f"Half-Life: {indicators.get('half_life', 'N/A')} candles\n"
    )

    try:
        llm = _build_llm(temperature=0.1, max_tokens=1200)
        response = await llm.ainvoke([
            SystemMessage(content=TECHNICALS_SYSTEM),
            HumanMessage(content=prompt_data),
        ])
        text = response.content
        assert isinstance(text, str)
    except Exception as exc:
        log.error("technicals.llm_error", ticker=ticker, error=str(exc))
        return {"technicals_report": _neutral_fallback(agent_name, ticker, f"LLM error: {exc}")}

    signal = _parse_signal(text)
    confidence = _parse_confidence(text)

    # Merge computed indicators into key_metrics
    key_metrics = {k: v for k, v in indicators.items() if k != "data_quality"}

    report = AnalystReport(
        agent_name=agent_name,
        ticker=ticker,
        signal=signal,
        confidence=confidence,
        reasoning=text,
        key_metrics=key_metrics,
        data_quality=indicator_quality,
    )

    log.info(
        "technicals.complete",
        ticker=ticker,
        signal=signal.value,
        confidence=confidence,
        rsi=indicators.get("rsi"),
        z_score=indicators.get("z_score"),
        hurst=indicators.get("hurst_exponent"),
        data_quality=indicator_quality,
    )
    return {"technicals_report": report}


# ---------------------------------------------------------------------------
# 4. Macro Analyst
# ---------------------------------------------------------------------------

MACRO_SYSTEM = """You are a macro analyst covering crypto markets with focus on Hyperliquid-traded assets. \
You evaluate broad market conditions that affect all crypto perp positions.

ANALYSIS FRAMEWORK:
1. Bitcoin Dominance & Correlation
   - BTC.D rising = risk-off, alts underperform
   - BTC.D falling = risk-on, alts outperform
   - High BTC correlation (>0.8) means macro dominates micro

2. Traditional Macro Proxy
   - DXY (Dollar Index): DXY up = crypto headwind, DXY down = crypto tailwind
   - US yields rising = tighter liquidity = bearish crypto
   - Equity market (SPX) correlation: higher in risk-off, lower in bull markets

3. Crypto-Specific Macro Factors
   - Stablecoin supply change: growing = new capital inflow (bullish), shrinking = outflow (bearish)
   - ETF flow data: net inflows = institutional demand (bullish), outflows = institutional selling
   - Bitcoin halving cycle: early post-halving = historically bullish, late cycle = caution
   - Exchange reserves: declining = accumulation (bullish), rising = distribution (bearish)

4. Regime Classification
   Output one of:
   - RISK_ON: favorable macro, expansion, inflows
   - RISK_OFF: unfavorable macro, contraction, outflows
   - TRANSITIONAL: mixed signals, regime shift underway
   - CRISIS: acute stress (depegs, exchange failures, regulatory shock)

OUTPUT FORMAT (strict):
SIGNAL: STRONG_BUY | BUY | NEUTRAL | SELL | STRONG_SELL
CONFIDENCE: 0.0-1.0
REGIME: RISK_ON | RISK_OFF | TRANSITIONAL | CRISIS
REASONING: <2-3 sentences on macro drivers and their crypto impact>
KEY_FACTORS: <comma-separated list of top 3 macro factors>"""


async def analyze_macro(state: HyperAlphaState) -> dict[str, Any]:
    """Run macro environment analysis."""
    ticker = state["ticker"]
    md = state.get("market_data", {})
    agent_name = "macro_analyst"

    mid_price = md.get("mid_price", 0)
    funding_rate = md.get("funding_rate", 0)
    open_interest = md.get("open_interest", 0)
    volume_24h = md.get("volume_24h", 0)
    price_change = md.get("price_change_24h_pct", 0)

    data_quality = 0.6  # Limited macro data from HL alone

    if mid_price == 0:
        log.warning("macro.no_data", ticker=ticker)
        return {"macro_report": _neutral_fallback(agent_name, ticker, "No macro data")}

    prompt_data = (
        f"Ticker under analysis: {ticker}\n"
        f"Current Price: ${mid_price:,.2f}\n"
        f"24h Change: {price_change:.2f}%\n"
        f"Funding Rate (8h): {funding_rate:.6f}\n"
        f"Open Interest: ${open_interest:,.0f}\n"
        f"Volume (24h): ${volume_24h:,.0f}\n"
        f"\nNote: External macro data (DXY, yields, ETF flows, stablecoin supply) "
        f"is not available. Use your knowledge of current macro conditions and "
        f"the Hyperliquid data above as proxy for market positioning."
    )

    try:
        llm = _build_llm(temperature=0.3, max_tokens=1000)
        response = await llm.ainvoke([
            SystemMessage(content=MACRO_SYSTEM),
            HumanMessage(content=prompt_data),
        ])
        text = response.content
        assert isinstance(text, str)
    except Exception as exc:
        log.error("macro.llm_error", ticker=ticker, error=str(exc))
        return {"macro_report": _neutral_fallback(agent_name, ticker, f"LLM error: {exc}")}

    signal = _parse_signal(text)
    confidence = _parse_confidence(text)

    # Extract regime
    regime = "UNKNOWN"
    for line in text.upper().splitlines():
        stripped = line.strip()
        if stripped.startswith("REGIME:"):
            regime = stripped.split(":", 1)[1].strip()
            break

    report = AnalystReport(
        agent_name=agent_name,
        ticker=ticker,
        signal=signal,
        confidence=confidence,
        reasoning=text,
        key_metrics={
            "regime": regime,
            "price": mid_price,
            "funding_rate": funding_rate,
        },
        data_quality=data_quality,
    )

    log.info(
        "macro.complete",
        ticker=ticker,
        signal=signal.value,
        confidence=confidence,
        regime=regime,
        data_quality=data_quality,
    )
    return {"macro_report": report}
