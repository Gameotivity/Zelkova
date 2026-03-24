"""
HyperAlpha — LangGraph Pipeline (Production-grade)

7-layer decision pipeline with sequential analyst execution,
timeouts, and structured error handling.

  [Market Data]
       |
       +-->  Fundamentals Analyst --+
       +-->  Sentiment Analyst -----+  (sequential)
       +-->  Technical Analyst -----+
       +-->  Macro Analyst ---------+
                    |
                    v
            Research Debate (Bull vs Bear)
                    |
                    v
            Stat Arb Engine
                    |
                    v
              Trader Agent
                    |
                    v
            Risk Management
                    |
                    v
             Fund Manager
                    |
                    v
            [Final Decision]
"""
import uuid
import time
import asyncio
from datetime import datetime, timezone
from langgraph.graph import StateGraph, END

from hyperalpha.types import HyperAlphaState, Signal
from hyperalpha.data.hyperliquid_connector import HyperliquidConnector
from hyperalpha.agents.fundamentals_analyst import analyze_fundamentals as run_fundamentals_analyst
from hyperalpha.agents.sentiment_analyst import analyze_sentiment as run_sentiment_analyst
from hyperalpha.agents.technicals_analyst import analyze_technicals as run_technicals_analyst
from hyperalpha.agents.macro_analyst import analyze_macro as run_macro_analyst
from hyperalpha.agents.research_debate import run_research_debate
from hyperalpha.agents.stat_arb import run_stat_arb as run_stat_arb_engine
from hyperalpha.agents.trader import run_trader as run_trader_agent
from hyperalpha.agents.risk_manager import run_risk_manager
from hyperalpha.agents.fund_manager import run_fund_manager
import structlog

logger = structlog.get_logger()


def build_graph() -> StateGraph:
    """Build the HyperAlpha LangGraph pipeline with sequential execution."""
    graph = StateGraph(HyperAlphaState)

    graph.add_node("fundamentals_analyst", run_fundamentals_analyst)
    graph.add_node("sentiment_analyst", run_sentiment_analyst)
    graph.add_node("technicals_analyst", run_technicals_analyst)
    graph.add_node("macro_analyst", run_macro_analyst)
    graph.add_node("research_debate", run_research_debate)
    graph.add_node("stat_arb_engine", run_stat_arb_engine)
    graph.add_node("trader_agent", run_trader_agent)
    graph.add_node("risk_manager", run_risk_manager)
    graph.add_node("fund_manager", run_fund_manager)

    graph.set_entry_point("fundamentals_analyst")
    graph.add_edge("fundamentals_analyst", "sentiment_analyst")
    graph.add_edge("sentiment_analyst", "technicals_analyst")
    graph.add_edge("technicals_analyst", "macro_analyst")
    graph.add_edge("macro_analyst", "research_debate")
    graph.add_edge("research_debate", "stat_arb_engine")
    graph.add_edge("stat_arb_engine", "trader_agent")
    graph.add_edge("trader_agent", "risk_manager")
    graph.add_edge("risk_manager", "fund_manager")
    graph.add_edge("fund_manager", END)

    return graph.compile()


class HyperAlphaEngine:
    """Main engine that runs the full pipeline for a given ticker."""

    def __init__(self):
        self.connector = HyperliquidConnector()
        self.graph = build_graph()

    async def analyze(self, ticker: str) -> HyperAlphaState:
        """Run the full 7-layer pipeline for a ticker with timeout."""
        from hyperalpha.config import settings

        run_id = str(uuid.uuid4())[:8]
        logger.info("pipeline_start", ticker=ticker, run_id=run_id)
        start_time = time.time()

        market_data = await self._fetch_market_data(ticker)

        initial_state: HyperAlphaState = {
            "ticker": ticker,
            "market_data": market_data,
            "fundamentals_report": None,
            "sentiment_report": None,
            "technicals_report": None,
            "macro_report": None,
            "debate_history": [],
            "debate_consensus": None,
            "stat_arb_signals": [],
            "strategy_signals": [],
            "trade_recommendation": None,
            "risk_assessment": None,
            "portfolio_state": None,
            "final_decision": None,
            "run_id": run_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "errors": [],
            "layer_latencies": {},
        }

        if settings.hl_account_address:
            try:
                user_state = await self.connector.get_user_state()
                if user_state:
                    from hyperalpha.types import PortfolioState
                    margin = user_state.get("marginSummary", {})
                    positions = user_state.get("assetPositions", [])
                    initial_state["portfolio_state"] = PortfolioState(
                        total_equity=float(margin.get("accountValue", 0)),
                        total_margin_used=float(margin.get("totalMarginUsed", 0)),
                        unrealized_pnl=float(margin.get("accountValue", 0)) - float(margin.get("totalRawUsd", 0)),
                        current_leverage=float(margin.get("totalMarginUsed", 0)) / max(float(margin.get("accountValue", 1)), 1),
                        open_positions=[p["position"] for p in positions if float(p["position"].get("szi", 0)) != 0],
                        position_count=sum(1 for p in positions if float(p["position"].get("szi", 0)) != 0),
                    )
            except Exception as e:
                logger.warning("portfolio_fetch_failed", error=str(e))

        try:
            final_state = await asyncio.wait_for(
                self.graph.ainvoke(initial_state),
                timeout=settings.pipeline_timeout_seconds,
            )
        except asyncio.TimeoutError:
            logger.error("pipeline_timeout", ticker=ticker, timeout=settings.pipeline_timeout_seconds)
            initial_state["errors"].append(f"Pipeline timed out after {settings.pipeline_timeout_seconds}s")
            return initial_state
        except Exception as e:
            logger.error("pipeline_failed", ticker=ticker, error=str(e))
            initial_state["errors"].append(str(e))
            return initial_state

        total_time = time.time() - start_time
        logger.info(
            "pipeline_complete",
            ticker=ticker, run_id=run_id, total_seconds=round(total_time, 1),
            approved=final_state.get("final_decision", {}) and getattr(final_state.get("final_decision"), "approved", False) if final_state.get("final_decision") else False,
        )
        return final_state

    async def _fetch_market_data(self, ticker: str) -> dict:
        """Fetch market data with retry."""
        for attempt in range(3):
            try:
                snapshot = await self.connector.get_market_snapshot(ticker)
                return {
                    "mid_price": snapshot.mid_price,
                    "mark_price": snapshot.mark_price,
                    "funding_rate": snapshot.funding_rate,
                    "open_interest": snapshot.open_interest,
                    "volume_24h": snapshot.volume_24h,
                    "price_change_24h_pct": snapshot.price_change_24h_pct,
                    "best_bid": snapshot.best_bid,
                    "best_ask": snapshot.best_ask,
                    "spread_bps": snapshot.spread_bps,
                    "order_book_imbalance": snapshot.order_book_imbalance,
                    "candles": [
                        {"interval": c["interval"], "data": c["data"]}
                        for c in snapshot.candles
                    ],
                }
            except Exception as e:
                logger.warning("market_data_retry", ticker=ticker, attempt=attempt + 1, error=str(e))
                if attempt == 2:
                    logger.error("market_data_failed", ticker=ticker)
                    return {"mid_price": 0, "error": str(e)}
                await asyncio.sleep(1)
        return {"mid_price": 0, "error": "Failed after 3 attempts"}

    async def close(self):
        await self.connector.close()


def format_decision_report(state: HyperAlphaState) -> str:
    """Format the final state into a human-readable report."""
    decision = state.get("final_decision")
    rec = decision.recommendation if decision and decision.recommendation else None
    risk = decision.risk_assessment if decision and decision.risk_assessment else None

    md = state.get("market_data", {})
    mid_price = md.get("mid_price", 0)
    funding = md.get("funding_rate", 0)
    oi = md.get("open_interest", 0)
    vol = md.get("volume_24h", 0)

    lines = [
        f"{'=' * 50}",
        f"  HYPERALPHA \u2014 TRADE REPORT",
        f"  Ticker: {state['ticker']}",
        f"  Run: {state.get('run_id', 'N/A')}",
        f"  Time: {state.get('timestamp', 'N/A')}",
        f"{'=' * 50}",
        f"\n LIVE MARKET DATA:",
        f"  Price: ${mid_price:,.2f}" if mid_price else "  Price: N/A",
        f"  Funding Rate: {funding:.6f}" if funding else "  Funding: N/A",
        f"  Open Interest: ${oi:,.0f}" if oi else "  OI: N/A",
        f"  24h Volume: ${vol:,.0f}" if vol else "  Volume: N/A",
    ]

    lines.append("\n ANALYST SIGNALS:")
    for key, label in [("fundamentals_report", "  Fundamentals"), ("sentiment_report", "  Sentiment"),
                       ("technicals_report", "  Technicals"), ("macro_report", "  Macro")]:
        report = state.get(key)
        if report:
            icon = "[+]" if "buy" in report.signal.value else "[-]" if "sell" in report.signal.value else "[ ]"
            lines.append(f"{icon} {label}: {report.signal.value.upper()} ({report.confidence:.0%})")

    # Strategy signals
    strategy_sigs = state.get("strategy_signals", [])
    if strategy_sigs:
        lines.append(f"\n STRATEGY SIGNALS ({len(strategy_sigs)} fired):")
        for s in strategy_sigs:
            icon = "+" if s.direction == "bullish" else "-"
            lines.append(f"  [{icon}] {s.name} ({s.timeframe}, {s.strength:.0%}): {s.description}")

    consensus = state.get("debate_consensus")
    if consensus:
        lines.append(f"\n DEBATE CONSENSUS:")
        if hasattr(consensus, "key_thesis"):
            lines.append(f"  Signal: {consensus.signal.value.upper()} ({consensus.confidence:.0%})")
            lines.append(f"  Thesis: {consensus.key_thesis[:200]}")
            lines.append(f"  Quality: {consensus.debate_quality:.0%}")

    if state.get("stat_arb_signals"):
        lines.append(f"\n STAT ARB SIGNALS:")
        for sig in state["stat_arb_signals"]:
            lines.append(f"  - {sig.strategy_name}: {sig.signal.value} (z={sig.z_score:.2f})")

    if rec:
        lines.append(f"\n{'_' * 50}")
        icon = "[LONG]" if rec.action == "long" else "[SHORT]" if rec.action == "short" else "[HOLD]"
        lines.append(f"{icon} RECOMMENDATION: {rec.action.upper()} {rec.ticker}")
        lines.append(f"  Market: {rec.market.value}")
        if rec.entry_price: lines.append(f"  Entry: ${rec.entry_price}")
        if rec.stop_loss: lines.append(f"  Stop Loss: ${rec.stop_loss}")
        if rec.take_profit: lines.append(f"  Take Profit: ${rec.take_profit}")
        if rec.size_usd: lines.append(f"  Size: ${rec.size_usd}")
        if rec.leverage: lines.append(f"  Leverage: {rec.leverage}x")
        lines.append(f"  Confidence: {rec.confidence:.0%}")
        if rec.time_horizon: lines.append(f"  Time Horizon: {rec.time_horizon}")
        lines.append(f"  Signal Alignment: {rec.signal_alignment}/4 analysts")
        if hasattr(rec, 'reasoning') and rec.reasoning:
            lines.append(f"\n TRADE THESIS:")
            lines.append(f"  {rec.reasoning}")

    if risk:
        lines.append(f"\n RISK ASSESSMENT:")
        lines.append(f"  Approved: {'YES' if risk.approved else 'NO'}")
        lines.append(f"  Risk Score: {risk.risk_score:.2f}")
        for w in risk.warnings:
            lines.append(f"  WARNING: {w}")
        if risk.veto_reason:
            lines.append(f"  VETO: {risk.veto_reason}")

    if decision:
        lines.append(f"\n{'=' * 50}")
        lines.append(f"{'APPROVED' if decision.approved else 'REJECTED'}")
        lines.append(f"  {decision.fund_manager_notes[:200]}")
        lines.append(f"{'=' * 50}")

    if state.get("errors"):
        lines.append(f"\n ERRORS:")
        for err in state["errors"]:
            lines.append(f"  - {err}")

    return "\n".join(lines)
