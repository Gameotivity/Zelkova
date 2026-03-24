"""HyperAlpha Super Agent — synthesizes all 8 sub-agent outputs into final decision.

Merges the roles of risk_manager + fund_manager into a single authority.
Has access to portfolio and execution tools.
"""
from __future__ import annotations

from crewai import Agent, Task

from hyperalpha.config import settings
from hyperalpha.mcp.portfolio_tools import get_portfolio_tools
from hyperalpha.rag.retriever import get_rag_tools

SUPER_AGENT_BACKSTORY = """You are the SUPER AGENT at HyperAlpha — the final decision-maker.
You receive analysis from 8 specialized sub-agents running in parallel:
1. Fundamentals Analyst — funding rates, OI, volume analysis
2. Sentiment Analyst — crowd positioning, liquidation data
3. Technicals Analyst — indicator interpretation
4. Macro Analyst — BTC dominance, DXY, macro environment
5. Research Debate — bull vs bear adversarial debate
6. Statistical Arbitrage — quantitative math-based signals
7. Trader Agent — trade recommendation synthesis
8. TA Strategy Agent — composite strategy signals (RSI divergence, golden cross, etc.)

Your job:
1. READ all 8 agent outputs carefully
2. EVALUATE signal alignment (how many agree on direction)
3. ASSESS RISK — check stop loss exists, size within limits, leverage OK
4. MAKE THE FINAL DECISION: APPROVE or REJECT with specific trade parameters

CRITICAL RULES:
- NEVER approve without a stop loss
- Size must be <= ${max_pos} USD
- Leverage must be <= {max_lev}x
- If 5+ agents agree on direction → high confidence
- If 3-4 agree → moderate confidence, smaller size
- If <3 agree → REJECT (no clear edge)
- Always output structured decision format
""".format(max_pos=settings.max_position_size_usd, max_lev=settings.max_leverage)

SUPER_AGENT_GOAL = (
    "Synthesize all 8 sub-agent analyses into a final trading decision. "
    "Evaluate signal alignment, assess risk, and approve or reject the trade "
    "with specific entry, stop loss, take profit, size, and leverage parameters."
)


def create_super_agent() -> Agent:
    """Create the Super Agent with portfolio + RAG tools."""
    tools = get_portfolio_tools() + get_rag_tools()

    return Agent(
        role="Super Agent — Final Decision Maker",
        goal=SUPER_AGENT_GOAL,
        backstory=SUPER_AGENT_BACKSTORY,
        tools=tools,
        llm=f"anthropic/{settings.deep_think_model}",
        verbose=settings.crew_verbose,
        allow_delegation=False,
        max_iter=3,
    )


def create_super_agent_task(
    agent: Agent,
    context_tasks: list[Task],
    ticker: str,
) -> Task:
    """Create the synthesis task that waits for all 8 sub-agents."""
    return Task(
        description=f"""Analyze ALL 8 sub-agent outputs for {ticker} and make the final decision.

For each sub-agent output, note:
- Signal direction (buy/sell/neutral)
- Confidence level
- Key reasoning

Then determine:
1. Signal alignment count (how many agree)
2. Overall confidence (weighted by agent confidence)
3. Risk assessment (stop loss, size, leverage checks)
4. Final action: long, short, or hold

OUTPUT FORMAT (strict):
DECISION: APPROVE or REJECT
ACTION: long | short | hold
ENTRY: <price>
STOP_LOSS: <price>
TAKE_PROFIT: <price>
SIZE_USD: <amount>
LEVERAGE: <multiplier>
CONFIDENCE: <0.0-1.0>
SIGNAL_ALIGNMENT: <count>/8
REASONING: <2-3 sentences>""",
        expected_output=(
            "A structured trading decision with DECISION, ACTION, ENTRY, "
            "STOP_LOSS, TAKE_PROFIT, SIZE_USD, LEVERAGE, CONFIDENCE, "
            "SIGNAL_ALIGNMENT, and REASONING fields."
        ),
        agent=agent,
        context=context_tasks,
    )
