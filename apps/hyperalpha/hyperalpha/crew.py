"""HyperAlpha CrewAI Orchestrator — Hub-and-Spoke Multi-Agent Pipeline.

Replaces the sequential LangGraph pipeline with parallel CrewAI execution.
8 sub-agents run simultaneously, all report to a Super Agent.
"""
from __future__ import annotations

import re
import time
import uuid
import asyncio
from typing import Optional

import structlog
from crewai import Agent, Crew, Task, Process

from hyperalpha.config import settings
from hyperalpha.data.hyperliquid_connector import HyperliquidConnector
from hyperalpha.mcp.market_data_tools import get_market_data_tools
from hyperalpha.mcp.indicators_tools import get_indicator_tools
from hyperalpha.rag.retriever import get_rag_tools
from hyperalpha.agents.super_agent import create_super_agent, create_super_agent_task
from hyperalpha.agents.ta_strategy_agent import create_ta_strategy_agent, create_ta_strategy_task
from hyperalpha.types import (
    OrchestratorState, SubAgentResult, SuperAgentDecision,
    Signal, AgentStatus,
)

logger = structlog.get_logger(__name__)

# ─── Sub-Agent Definitions ───────────────────────────────

AGENT_CONFIGS = [
    {
        "name": "Fundamentals Analyst",
        "role": "Cryptocurrency Fundamentals Analyst",
        "goal": "Analyze funding rates, open interest, volume, and bid-ask spreads to determine fundamental market health.",
        "backstory": "Expert in crypto derivatives market microstructure. Evaluates funding rate extremes, OI divergences, volume profiles, and spread dynamics.",
        "tools_fn": "market_data",
    },
    {
        "name": "Sentiment Analyst",
        "role": "Market Sentiment Analyst",
        "goal": "Gauge crowd positioning, liquidation risk, and overall market sentiment.",
        "backstory": "Specialist in behavioral finance and crowd psychology. Analyzes volume patterns, liquidation cascades, and market regime classification.",
        "tools_fn": "market_data",
    },
    {
        "name": "Technicals Analyst",
        "role": "Technical Analysis Specialist",
        "goal": "Interpret technical indicators (RSI, MACD, Bollinger, EMA, Ichimoku) and determine trend direction.",
        "backstory": "Veteran chartist with expertise in multi-timeframe analysis. Interprets momentum, trend, and volatility indicators across 1h and 4h timeframes.",
        "tools_fn": "indicators",
    },
    {
        "name": "Macro Analyst",
        "role": "Crypto Macro Analyst",
        "goal": "Evaluate macro environment including BTC dominance, correlation with TradFi, and crypto-specific macro factors.",
        "backstory": "Macro strategist bridging traditional finance and crypto. Evaluates DXY correlation, BTC dominance shifts, and global risk appetite.",
        "tools_fn": "market_data",
    },
    {
        "name": "Research Debate",
        "role": "Bull vs Bear Research Debater",
        "goal": "Run an adversarial debate presenting both bullish and bearish cases for the asset.",
        "backstory": "Dialectical analyst who stress-tests investment theses by arguing both sides. Produces a consensus signal with conviction-weighted confidence.",
        "tools_fn": "rag",
    },
    {
        "name": "Stat Arb Engine",
        "role": "Statistical Arbitrage Analyst",
        "goal": "Identify quantitative arbitrage opportunities through funding rate arb, mean reversion, and order book imbalance.",
        "backstory": "Quantitative researcher specializing in statistical arbitrage. Uses z-scores, Hurst exponents, and order book microstructure for edge detection.",
        "tools_fn": "indicators",
    },
    {
        "name": "Trader Agent",
        "role": "Trade Recommendation Synthesizer",
        "goal": "Synthesize all available market data into a concrete trade recommendation with entry, stop loss, take profit, and position size.",
        "backstory": "Senior trader who translates multi-source analysis into executable trade plans. Specializes in risk-reward optimization and position sizing.",
        "tools_fn": "market_data",
    },
]

TOOL_REGISTRY = {
    "market_data": get_market_data_tools,
    "indicators": get_indicator_tools,
    "rag": get_rag_tools,
}


def _create_sub_agents(ticker: str) -> tuple[list[Agent], list[Task]]:
    """Create all 8 sub-agents and their parallel tasks."""
    agents = []
    tasks = []

    for cfg in AGENT_CONFIGS:
        tools = TOOL_REGISTRY[cfg["tools_fn"]]()
        agent = Agent(
            role=cfg["role"],
            goal=cfg["goal"],
            backstory=cfg["backstory"],
            tools=tools,
            llm=f"anthropic/{settings.quick_think_model}",
            verbose=settings.crew_verbose,
            allow_delegation=False,
            max_iter=3,
        )
        task = Task(
            description=f"Analyze {ticker} from the perspective of {cfg['name']}. "
                        f"Use your tools to gather data, then provide your signal "
                        f"(buy/sell/neutral), confidence (0-1), and reasoning.",
            expected_output=f"SIGNAL: buy|sell|neutral, CONFIDENCE: 0.0-1.0, REASONING: analysis",
            agent=agent,
            async_execution=True,
        )
        agents.append(agent)
        tasks.append(task)

    # 8th agent: TA Strategy
    ta_agent = create_ta_strategy_agent()
    ta_task = create_ta_strategy_task(ta_agent, ticker)
    agents.append(ta_agent)
    tasks.append(ta_task)

    return agents, tasks


def _parse_super_decision(output: str, ticker: str) -> SuperAgentDecision:
    """Parse Super Agent output into structured decision."""
    def _ext(pattern: str, default: str = "") -> str:
        m = re.search(pattern, output, re.IGNORECASE)
        return m.group(1).strip() if m else default

    def _ext_f(pattern: str, default: float = 0.0) -> float:
        m = re.search(pattern, output, re.IGNORECASE)
        try:
            return float(m.group(1)) if m else default
        except (ValueError, TypeError):
            return default

    approved = _ext(r"DECISION\s*[:=]\s*(\w+)", "reject").upper() == "APPROVE"
    action = _ext(r"ACTION\s*[:=]\s*(\w+)", "hold").lower()
    if action not in ("long", "short", "hold", "close"):
        action = "hold"

    alignment_raw = _ext(r"SIGNAL_ALIGNMENT\s*[:=]\s*(\d+)", "0")

    return SuperAgentDecision(
        approved=approved,
        action=action,
        ticker=ticker,
        entry_price=_ext_f(r"ENTRY\s*[:=]\s*\$?([\d.]+)"),
        stop_loss=_ext_f(r"STOP_LOSS\s*[:=]\s*\$?([\d.]+)"),
        take_profit=_ext_f(r"TAKE_PROFIT\s*[:=]\s*\$?([\d.]+)"),
        size_usd=_ext_f(r"SIZE_USD\s*[:=]\s*\$?([\d.]+)"),
        leverage=_ext_f(r"LEVERAGE\s*[:=]\s*([\d.]+)", 1.0),
        confidence=_ext_f(r"CONFIDENCE\s*[:=]\s*([\d.]+)"),
        reasoning=_ext(r"REASONING\s*[:=]\s*(.+?)(?:\n|$)"),
        execution_ready=approved and action in ("long", "short"),
        signal_alignment=int(alignment_raw) if alignment_raw.isdigit() else 0,
    )


class HyperAlphaCrew:
    """CrewAI-based orchestrator — 8 parallel agents + Super Agent."""

    def __init__(self):
        self.connector = HyperliquidConnector()

    async def analyze(self, ticker: str) -> OrchestratorState:
        """Run the full hub-and-spoke pipeline."""
        run_id = str(uuid.uuid4())[:8]
        logger.info("crew_start", ticker=ticker, run_id=run_id)
        start = time.time()

        state = OrchestratorState(run_id=run_id, ticker=ticker)

        # Fetch market data
        try:
            snapshot = await self.connector.get_market_snapshot(ticker)
            state.market_data = {
                "mid_price": snapshot.mid_price,
                "funding_rate": snapshot.funding_rate,
                "volume_24h": snapshot.volume_24h,
                "open_interest": snapshot.open_interest,
            }
        except Exception as e:
            state.errors.append(f"Market data fetch failed: {e}")
            logger.error("crew_market_data_failed", error=str(e))

        # Build crew
        sub_agents, sub_tasks = _create_sub_agents(ticker)
        super_agent = create_super_agent()
        super_task = create_super_agent_task(super_agent, sub_tasks, ticker)

        crew = Crew(
            agents=[*sub_agents, super_agent],
            tasks=[*sub_tasks, super_task],
            process=Process.sequential,
            verbose=settings.crew_verbose,
            max_rpm=settings.crew_max_rpm,
        )

        # Run crew
        try:
            result = crew.kickoff()
            output = str(result)
            state.super_decision = _parse_super_decision(output, ticker)
            logger.info(
                "crew_complete", ticker=ticker, run_id=run_id,
                approved=state.super_decision.approved,
                action=state.super_decision.action,
                duration=round(time.time() - start, 1),
            )
        except Exception as e:
            state.errors.append(f"Crew execution failed: {e}")
            logger.error("crew_failed", error=str(e))

        state.total_duration_seconds = time.time() - start
        return state

    async def close(self):
        await self.connector.close()


def format_crew_report(state: OrchestratorState) -> str:
    """Format crew results into human-readable report."""
    d = state.super_decision
    lines = [
        f"{'=' * 55}",
        f"  HYPERALPHA v2 — CREW REPORT",
        f"  Ticker: {state.ticker} | Run: {state.run_id}",
        f"  Duration: {state.total_duration_seconds:.1f}s",
        f"{'=' * 55}",
    ]

    if state.market_data:
        price = state.market_data.get("mid_price", 0)
        lines.append(f"\n  Price: ${price:,.2f}")

    if d:
        icon = "LONG" if d.action == "long" else "SHORT" if d.action == "short" else "HOLD"
        lines.append(f"\n  DECISION: {'APPROVED' if d.approved else 'REJECTED'}")
        lines.append(f"  Action: {icon}")
        if d.entry_price: lines.append(f"  Entry: ${d.entry_price:,.2f}")
        if d.stop_loss: lines.append(f"  Stop Loss: ${d.stop_loss:,.2f}")
        if d.take_profit: lines.append(f"  Take Profit: ${d.take_profit:,.2f}")
        if d.size_usd: lines.append(f"  Size: ${d.size_usd:,.0f}")
        lines.append(f"  Leverage: {d.leverage}x")
        lines.append(f"  Confidence: {d.confidence:.0%}")
        lines.append(f"  Signal Alignment: {d.signal_alignment}/8")
        if d.reasoning:
            lines.append(f"\n  Reasoning: {d.reasoning[:300]}")

    if state.errors:
        lines.append(f"\n  ERRORS: {', '.join(state.errors)}")

    lines.append(f"{'=' * 55}")
    return "\n".join(lines)
