"""HyperAlpha Layer 2 — Macro Analyst."""
from __future__ import annotations

from typing import Any

import structlog
from langchain_core.messages import SystemMessage, HumanMessage

from hyperalpha.types import AnalystReport, HyperAlphaState
from hyperalpha.agents._helpers import neutral_fallback, parse_signal, parse_confidence, build_llm

log = structlog.get_logger(__name__)

MACRO_SYSTEM = """You are a macro analyst covering crypto markets with focus on Hyperliquid-traded assets. \
You evaluate broad market conditions that affect all crypto perp positions.

ANALYSIS FRAMEWORK:
1. Bitcoin Dominance & Correlation
   - BTC.D rising = risk-off, alts underperform
   - BTC.D falling = risk-on, alts outperform

2. Traditional Macro Proxy
   - DXY up = crypto headwind, DXY down = crypto tailwind
   - US yields rising = tighter liquidity = bearish crypto

3. Crypto-Specific Macro Factors
   - Stablecoin supply: growing = inflow (bullish), shrinking = outflow (bearish)
   - ETF flow data: net inflows = institutional demand, outflows = selling
   - Bitcoin halving cycle: early post-halving = historically bullish

4. Regime Classification
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
    data_quality = 0.6

    if mid_price == 0:
        log.warning("macro.no_data", ticker=ticker)
        return {"macro_report": neutral_fallback(agent_name, ticker, "No macro data")}

    prompt_data = (
        f"Ticker under analysis: {ticker}\nCurrent Price: ${mid_price:,.2f}\n"
        f"24h Change: {price_change:.2f}%\nFunding Rate (8h): {funding_rate:.6f}\n"
        f"Open Interest: ${open_interest:,.0f}\nVolume (24h): ${volume_24h:,.0f}\n"
        f"\nNote: External macro data (DXY, yields, ETF flows, stablecoin supply) "
        f"is not available. Use your knowledge of current macro conditions and "
        f"the Hyperliquid data above as proxy for market positioning."
    )

    try:
        llm = build_llm(temperature=0.3, max_tokens=1000)
        response = await llm.ainvoke([SystemMessage(content=MACRO_SYSTEM), HumanMessage(content=prompt_data)])
        text = response.content
        assert isinstance(text, str)
    except Exception as exc:
        log.error("macro.llm_error", ticker=ticker, error=str(exc))
        return {"macro_report": neutral_fallback(agent_name, ticker, f"LLM error: {exc}")}

    regime = "UNKNOWN"
    for line in text.upper().splitlines():
        stripped = line.strip()
        if stripped.startswith("REGIME:"):
            regime = stripped.split(":", 1)[1]
            break

    report = AnalystReport(
        agent_name=agent_name, ticker=ticker,
        signal=parse_signal(text), confidence=parse_confidence(text),
        reasoning=text, key_metrics={"regime": regime, "price": mid_price, "funding_rate": funding_rate},
        data_quality=data_quality,
    )
    log.info("macro.complete", ticker=ticker, signal=report.signal.value, confidence=report.confidence, regime=regime, data_quality=data_quality)
    return {"macro_report": report}
