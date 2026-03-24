"""HyperAlpha TA Strategy Agent — dedicated composite strategy signal analysis.

The 8th sub-agent. Runs all 10+ composite strategy signals and reports
which patterns are firing and their implications.
"""
from __future__ import annotations

from crewai import Agent, Task

from hyperalpha.config import settings
from hyperalpha.mcp.indicators_tools import get_indicator_tools
from hyperalpha.rag.retriever import get_rag_tools

TA_BACKSTORY = """You are a TECHNICAL ANALYSIS STRATEGY specialist at HyperAlpha.
You use advanced composite strategy signals — not just raw indicators, but
patterns that combine multiple indicators into high-probability setups.

Your toolkit includes:
1. RSI Divergence Reversal — price/RSI divergence at extremes
2. Golden Cross / Death Cross — EMA 50/200 crossovers
3. EMA Pullback — trend continuation entries
4. MACD Histogram Reversal — momentum flip detection
5. Bollinger Band Squeeze Breakout — volatility expansion signals
6. Bollinger Mean Reversion — range-bound bounces
7. Fibonacci Confluence — key retracement levels with confirmation
8. VWAP Reclaim — institutional price level signals
9. Ichimoku Kumo Breakout — cloud breakout with Tenkan/Kijun cross
10. Stochastic + RSI Double Confirmation — multi-oscillator agreement
11. ATR Chandelier Exit — volatility-based trailing stops

You MUST use the compute_strategy_signals tool to get the actual signals,
then interpret them for the current market context.

Focus on CONFLUENCE — when 2-3 signals from different categories agree,
the setup is high-probability. Report which signals fired and why they matter."""

TA_GOAL = (
    "Compute and interpret all composite strategy signals for the given ticker. "
    "Report which patterns are firing, their direction (bullish/bearish), "
    "strength, and the overall confluence picture."
)


def create_ta_strategy_agent() -> Agent:
    """Create the TA Strategy Agent with indicator + RAG tools."""
    tools = get_indicator_tools() + get_rag_tools()

    return Agent(
        role="Technical Analysis Strategy Specialist",
        goal=TA_GOAL,
        backstory=TA_BACKSTORY,
        tools=tools,
        llm=f"anthropic/{settings.quick_think_model}",
        verbose=settings.crew_verbose,
        allow_delegation=False,
        max_iter=3,
    )


def create_ta_strategy_task(agent: Agent, ticker: str) -> Task:
    """Create the TA strategy analysis task."""
    return Task(
        description=f"""Analyze {ticker} using composite strategy signals.

Steps:
1. Use compute_strategy_signals tool for {ticker}
2. Use retrieve_strategy_knowledge to get context on any firing signals
3. Evaluate signal confluence (how many agree on direction)
4. Assess overall technical picture

OUTPUT FORMAT:
SIGNAL: buy | sell | neutral
CONFIDENCE: <0.0-1.0>
SIGNALS_FIRED: <count>
BULLISH_SIGNALS: <list>
BEARISH_SIGNALS: <list>
CONFLUENCE: strong | moderate | weak | conflicting
KEY_PATTERN: <most significant pattern>
REASONING: <2-3 sentences on the technical picture>""",
        expected_output=(
            "A structured TA report with SIGNAL, CONFIDENCE, fired signal counts, "
            "confluence assessment, and key pattern identification."
        ),
        agent=agent,
        async_execution=True,
    )
