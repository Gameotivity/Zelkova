"""HyperAlpha Layer 2 — Sentiment Analyst."""
from __future__ import annotations

from typing import Any

import structlog
from langchain_core.messages import SystemMessage, HumanMessage

from hyperalpha.types import AnalystReport, HyperAlphaState
from hyperalpha.agents._helpers import neutral_fallback, parse_signal, parse_confidence, build_llm

log = structlog.get_logger(__name__)

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
        return {"sentiment_report": neutral_fallback(agent_name, ticker, "No market data")}

    prompt_data = (
        f"Ticker: {ticker}\nCurrent Price: ${mid_price:,.2f}\n"
        f"24h Price Change: {price_change:.2f}%\nVolume (24h): ${volume_24h:,.0f}\n"
        f"Funding Rate (8h): {funding_rate:.6f}\nOpen Interest: ${open_interest:,.0f}\n"
        f"Order Book Imbalance: {book_imbalance:.3f} (-1=ask heavy, +1=bid heavy)\n"
        f"Note: Social/liquidation data not available — use price action and funding as sentiment proxy"
    )

    try:
        llm = build_llm(temperature=0.3, max_tokens=1000)
        response = await llm.ainvoke([SystemMessage(content=SENTIMENT_SYSTEM), HumanMessage(content=prompt_data)])
        text = response.content
        assert isinstance(text, str)
    except Exception as exc:
        log.error("sentiment.llm_error", ticker=ticker, error=str(exc))
        return {"sentiment_report": neutral_fallback(agent_name, ticker, f"LLM error: {exc}")}

    regime = "UNKNOWN"
    for line in text.upper().splitlines():
        stripped = line.strip()
        if stripped.startswith("REGIME:"):
            regime = stripped.split(":", 1)[1].strip()
            break

    report = AnalystReport(
        agent_name=agent_name, ticker=ticker,
        signal=parse_signal(text), confidence=parse_confidence(text),
        reasoning=text, key_metrics={"regime": regime, "funding_rate": funding_rate},
        data_quality=data_quality,
    )
    log.info("sentiment.complete", ticker=ticker, signal=report.signal.value, confidence=report.confidence, regime=regime)
    return {"sentiment_report": report}
