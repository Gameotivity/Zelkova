"""HyperAlpha Layer 2 — Fundamentals Analyst."""
from __future__ import annotations

from typing import Any

import structlog
from langchain_core.messages import SystemMessage, HumanMessage

from hyperalpha.types import AnalystReport, HyperAlphaState
from hyperalpha.agents._helpers import neutral_fallback, parse_signal, parse_confidence, build_llm

log = structlog.get_logger(__name__)

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
        return {"fundamentals_report": neutral_fallback(agent_name, ticker, "No market data")}

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
        llm = build_llm(temperature=0.2, max_tokens=1000)
        response = await llm.ainvoke([
            SystemMessage(content=FUNDAMENTALS_SYSTEM),
            HumanMessage(content=prompt_data),
        ])
        text = response.content
        assert isinstance(text, str)
    except Exception as exc:
        log.error("fundamentals.llm_error", ticker=ticker, error=str(exc))
        return {"fundamentals_report": neutral_fallback(agent_name, ticker, f"LLM error: {exc}")}

    report = AnalystReport(
        agent_name=agent_name,
        ticker=ticker,
        signal=parse_signal(text),
        confidence=parse_confidence(text),
        reasoning=text,
        key_metrics={"funding_rate": funding_rate, "open_interest": open_interest, "volume_24h": volume_24h},
        data_quality=data_quality,
    )

    log.info("fundamentals.complete", ticker=ticker, signal=report.signal.value, confidence=report.confidence, data_quality=data_quality)
    return {"fundamentals_report": report}
