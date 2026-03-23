"""
HyperAlpha — Layer 3: Bull vs Bear Research Debate.

Two adversarial researcher agents (Bull & Bear) debate the trade thesis
using Claude. A Head of Research synthesizes the final consensus.

Features:
- Multi-round debate with configurable rounds (default 3)
- Convergence detection: early stop if convictions converge within 0.15
- Structured DebateConsensus output with debate_quality metric
- Robust conviction parsing with multiple format support
"""
from __future__ import annotations

import re
from typing import Optional

import structlog
from langchain_anthropic import ChatAnthropic
from langchain_core.messages import HumanMessage

from hyperalpha.config import settings
from hyperalpha.types import (
    AnalystReport,
    DebateConsensus,
    DebatePosition,
    HyperAlphaState,
    Signal,
)

log = structlog.get_logger(__name__)

SIGNAL_MAP: dict[str, Signal] = {
    "strong_buy": Signal.STRONG_BUY,
    "buy": Signal.BUY,
    "neutral": Signal.NEUTRAL,
    "sell": Signal.SELL,
    "strong_sell": Signal.STRONG_SELL,
}

CONVERGENCE_THRESHOLD = 0.15
CONVERGENCE_ROUNDS_REQUIRED = 2


def _get_llm() -> ChatAnthropic:
    return ChatAnthropic(
        model=settings.deep_think_model,
        api_key=settings.anthropic_api_key,
        timeout=settings.llm_timeout_seconds,
        max_retries=settings.llm_max_retries,
        temperature=0.7,
    )


def _format_analyst_reports(state: HyperAlphaState) -> str:
    """Compile analyst reports into a readable brief for debaters."""
    sections: list[str] = []
    report_keys = [
        ("Fundamentals", "fundamentals_report"),
        ("Sentiment", "sentiment_report"),
        ("Technicals", "technicals_report"),
        ("Macro", "macro_report"),
    ]
    for label, key in report_keys:
        report: Optional[AnalystReport] = state.get(key)
        if report is None:
            sections.append(f"[{label}] No data available.")
            continue
        sections.append(
            f"[{label}] Signal={report.signal.value} "
            f"Confidence={report.confidence:.0%} "
            f"Quality={report.data_quality:.0%}\n"
            f"  Reasoning: {report.reasoning}\n"
            f"  Key Metrics: {report.key_metrics}"
        )
    return "\n\n".join(sections)


def _parse_conviction(text: str) -> float:
    """Parse conviction from LLM output, supporting multiple formats."""
    patterns = [
        r"CONVICTION\s*[:=]\s*(\d+(?:\.\d+)?)",
        r"conviction\s*[:=]\s*(\d+(?:\.\d+)?)",
        r"Conviction\s*[:=]\s*(\d+(?:\.\d+)?)",
        r"\*\*conviction\*\*\s*[:=]\s*(\d+(?:\.\d+)?)",
        r"(\d+(?:\.\d+)?)\s*/\s*1(?:\.0)?",
    ]
    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            value = float(match.group(1))
            if value > 1.0:
                value = value / 100.0
            return max(0.0, min(1.0, value))

    # Fallback: look for any decimal between 0 and 1 near "conviction"
    conviction_region = re.search(
        r"(?i)conviction.{0,30}?(\d\.\d+)", text
    )
    if conviction_region:
        return max(0.0, min(1.0, float(conviction_region.group(1))))

    log.warning("conviction_parse_fallback", text_preview=text[:200])
    return 0.5


def _parse_argument(text: str) -> str:
    """Extract the ARGUMENT section from structured LLM output."""
    match = re.search(
        r"ARGUMENT\s*[:=]\s*(.*?)(?=\n(?:CONVICTION|CONCESSIONS)|$)",
        text,
        re.DOTALL | re.IGNORECASE,
    )
    return match.group(1).strip() if match else text.strip()


def _parse_concessions(text: str) -> list[str]:
    """Extract concessions from the LLM output."""
    match = re.search(
        r"CONCESSIONS?\s*[:=]\s*(.*?)(?=\n(?:CONVICTION|ARGUMENT)|$)",
        text,
        re.DOTALL | re.IGNORECASE,
    )
    if not match:
        return []
    raw = match.group(1).strip()
    lines = [
        line.strip().lstrip("•-*").strip()
        for line in raw.split("\n")
        if line.strip()
    ]
    return [line for line in lines if len(line) > 5]


def _build_bull_prompt(
    ticker: str,
    analyst_brief: str,
    round_num: int,
    total_rounds: int,
    bear_prev: Optional[str],
) -> str:
    """Build the Bull researcher prompt with explicit output format."""
    prior_context = ""
    if bear_prev:
        prior_context = (
            f"\n\nThe Bear researcher's previous argument:\n"
            f"---\n{bear_prev}\n---\n"
            f"You MUST directly counter their strongest points.\n"
        )

    return f"""You are the BULL researcher on the HyperAlpha trading desk.
Your job: argue the BULLISH case for {ticker} with maximum rigour.

== ANALYST RESEARCH BRIEF ==
{analyst_brief}
{prior_context}
This is round {round_num} of {total_rounds}.

== YOUR TASK ==
Build the strongest possible bullish argument using the analyst data.
Focus on: catalysts, momentum, undervaluation, positive sentiment.
Be specific — cite numbers from the research brief.

== REQUIRED OUTPUT FORMAT ==
ARGUMENT: <Your full bullish argument. 3-5 paragraphs. Cite analyst data.>

CONVICTION: <A single decimal number from 0.0 to 1.0, e.g. 0.75>
(0.0 = no conviction at all, 0.5 = uncertain, 1.0 = absolute certainty this is a buy)

CONCESSIONS: <List any bearish points you concede have merit>
- <concession 1>
- <concession 2>

== EXAMPLE ==
ARGUMENT: The technicals show a clear breakout above the 200-day MA ...
CONVICTION: 0.72
CONCESSIONS:
- Funding rates are elevated which adds carry cost
- Macro headwinds could dampen short-term upside"""


def _build_bear_prompt(
    ticker: str,
    analyst_brief: str,
    round_num: int,
    total_rounds: int,
    bull_prev: str,
) -> str:
    """Build the Bear researcher prompt with explicit output format."""
    return f"""You are the BEAR researcher on the HyperAlpha trading desk.
Your job: argue the BEARISH case for {ticker} with maximum rigour.

== ANALYST RESEARCH BRIEF ==
{analyst_brief}

== BULL'S ARGUMENT (Round {round_num}) ==
---
{bull_prev}
---

This is round {round_num} of {total_rounds}.

== YOUR TASK ==
Dismantle the Bull's argument point by point. Identify risks they ignored.
Focus on: overvaluation, negative catalysts, deteriorating momentum, risk.
Be specific — cite numbers from the research brief and counter the Bull's data.

== REQUIRED OUTPUT FORMAT ==
ARGUMENT: <Your full bearish counter-argument. 3-5 paragraphs.>

CONVICTION: <A single decimal number from 0.0 to 1.0, e.g. 0.65>
(0.0 = no bearish conviction, 0.5 = uncertain, 1.0 = absolute certainty this is a sell)

CONCESSIONS: <List any bullish points you concede have merit>
- <concession 1>
- <concession 2>

== EXAMPLE ==
ARGUMENT: While the Bull cites the 200-day MA breakout, volume is declining ...
CONVICTION: 0.68
CONCESSIONS:
- The fundamental metrics do show improving on-chain activity
- Short-term sentiment is genuinely positive"""


def _build_consensus_prompt(
    ticker: str,
    debate_history: list[DebatePosition],
    analyst_brief: str,
) -> str:
    """Build Head of Research consensus prompt with structured output."""
    debate_log = ""
    for pos in debate_history:
        side_label = "BULL" if pos.side == "bull" else "BEAR"
        debate_log += (
            f"\n[Round {pos.round_number} — {side_label}] "
            f"(conviction: {pos.conviction:.2f})\n"
            f"{pos.argument}\n"
        )

    bull_final = [p for p in debate_history if p.side == "bull"]
    bear_final = [p for p in debate_history if p.side == "bear"]
    bull_conv = bull_final[-1].conviction if bull_final else 0.5
    bear_conv = bear_final[-1].conviction if bear_final else 0.5

    return f"""You are the HEAD OF RESEARCH at the HyperAlpha trading desk.
You have observed a structured Bull vs Bear debate on {ticker}.

== ANALYST RESEARCH BRIEF ==
{analyst_brief}

== FULL DEBATE TRANSCRIPT ==
{debate_log}

== FINAL CONVICTIONS ==
Bull final conviction: {bull_conv:.2f}
Bear final conviction: {bear_conv:.2f}

== YOUR TASK ==
Synthesize a consensus from this debate. Weigh the strength of arguments,
quality of evidence cited, and concessions made by each side.

TIE-BREAKING GUIDANCE: If convictions are within 0.15 of each other:
- Default to NEUTRAL unless one side cited significantly stronger data
- If technical + fundamental agree, favour that direction
- If sentiment is the only differentiator, reduce confidence by 0.1

== REQUIRED OUTPUT FORMAT (follow exactly) ==
CONSENSUS_SIGNAL: <one of: strong_buy, buy, neutral, sell, strong_sell>
CONSENSUS_CONFIDENCE: <decimal 0.0 to 1.0, e.g. 0.65>
KEY_THESIS: <1-2 sentence summary of the winning argument>
DECISIVE_FACTOR: <The single most important factor that tipped the balance>

== EXAMPLE ==
CONSENSUS_SIGNAL: buy
CONSENSUS_CONFIDENCE: 0.68
KEY_THESIS: Technical breakout confirmed by improving fundamentals outweighs elevated funding risk.
DECISIVE_FACTOR: On-chain activity growth of 15% WoW combined with price above key resistance."""


def _parse_consensus(
    text: str,
    bull_final_conviction: float,
    bear_final_conviction: float,
    debate_quality: float,
) -> DebateConsensus:
    """Parse structured consensus from Head of Research output."""
    signal_match = re.search(
        r"CONSENSUS_SIGNAL\s*[:=]\s*(\w+)", text, re.IGNORECASE
    )
    confidence_match = re.search(
        r"CONSENSUS_CONFIDENCE\s*[:=]\s*(\d+(?:\.\d+)?)",
        text,
        re.IGNORECASE,
    )
    thesis_match = re.search(
        r"KEY_THESIS\s*[:=]\s*(.*?)(?=\n(?:DECISIVE_FACTOR|$))",
        text,
        re.DOTALL | re.IGNORECASE,
    )
    factor_match = re.search(
        r"DECISIVE_FACTOR\s*[:=]\s*(.*?)$",
        text,
        re.DOTALL | re.IGNORECASE,
    )

    signal_str = (
        signal_match.group(1).strip().lower() if signal_match else "neutral"
    )
    signal = SIGNAL_MAP.get(signal_str, Signal.NEUTRAL)

    raw_confidence = (
        float(confidence_match.group(1)) if confidence_match else 0.5
    )
    if raw_confidence > 1.0:
        raw_confidence = raw_confidence / 100.0
    confidence = max(0.0, min(1.0, raw_confidence))

    key_thesis = (
        thesis_match.group(1).strip() if thesis_match else "No thesis parsed."
    )
    decisive_factor = (
        factor_match.group(1).strip()
        if factor_match
        else "No decisive factor parsed."
    )

    return DebateConsensus(
        signal=signal,
        confidence=confidence,
        key_thesis=key_thesis,
        bull_final_conviction=bull_final_conviction,
        bear_final_conviction=bear_final_conviction,
        decisive_factor=decisive_factor,
        debate_quality=debate_quality,
        raw_text=text,
    )


def _compute_debate_quality(
    debate_history: list[DebatePosition],
) -> float:
    """Compute debate quality from conviction spread and consistency.

    Higher quality when:
    - Convictions are decisive (far from 0.5)
    - Both sides maintain consistent conviction trajectories
    - Final convictions diverge (clear winner)
    """
    if len(debate_history) < 2:
        return 0.3

    bull_convictions = [
        p.conviction for p in debate_history if p.side == "bull"
    ]
    bear_convictions = [
        p.conviction for p in debate_history if p.side == "bear"
    ]

    if not bull_convictions or not bear_convictions:
        return 0.3

    # Factor 1: Final conviction spread (0-1)
    final_spread = abs(bull_convictions[-1] - bear_convictions[-1])
    spread_score = min(1.0, final_spread / 0.5)

    # Factor 2: Conviction decisiveness — how far from 0.5
    bull_decisiveness = abs(bull_convictions[-1] - 0.5) * 2
    bear_decisiveness = abs(bear_convictions[-1] - 0.5) * 2
    decisiveness_score = (bull_decisiveness + bear_decisiveness) / 2

    # Factor 3: Consistency — low variance in conviction trajectory
    consistency_score = 1.0
    if len(bull_convictions) >= 2:
        bull_variance = _variance(bull_convictions)
        bear_variance = _variance(bear_convictions)
        avg_variance = (bull_variance + bear_variance) / 2
        consistency_score = max(0.0, 1.0 - avg_variance * 10)

    quality = (
        0.4 * spread_score
        + 0.35 * decisiveness_score
        + 0.25 * consistency_score
    )
    return round(max(0.0, min(1.0, quality)), 3)


def _variance(values: list[float]) -> float:
    """Compute variance of a list of floats."""
    if len(values) < 2:
        return 0.0
    mean = sum(values) / len(values)
    return sum((v - mean) ** 2 for v in values) / len(values)


def _check_convergence(
    debate_history: list[DebatePosition],
) -> bool:
    """Detect if bull and bear convictions have converged.

    Returns True if |bull - bear| < CONVERGENCE_THRESHOLD
    for CONVERGENCE_ROUNDS_REQUIRED consecutive rounds.
    """
    bull_by_round: dict[int, float] = {}
    bear_by_round: dict[int, float] = {}
    for pos in debate_history:
        if pos.side == "bull":
            bull_by_round[pos.round_number] = pos.conviction
        else:
            bear_by_round[pos.round_number] = pos.conviction

    common_rounds = sorted(
        set(bull_by_round.keys()) & set(bear_by_round.keys())
    )
    if len(common_rounds) < CONVERGENCE_ROUNDS_REQUIRED:
        return False

    consecutive_converged = 0
    for rnd in common_rounds:
        spread = abs(bull_by_round[rnd] - bear_by_round[rnd])
        if spread < CONVERGENCE_THRESHOLD:
            consecutive_converged += 1
            if consecutive_converged >= CONVERGENCE_ROUNDS_REQUIRED:
                return True
        else:
            consecutive_converged = 0

    return False


def run_research_debate(state: HyperAlphaState) -> dict:
    """Execute the Bull vs Bear debate and return consensus.

    Runs up to max_debate_rounds rounds. Each round:
    1. Bull argues (or counters Bear's previous argument)
    2. Bear counters Bull's argument

    Early termination on conviction convergence.
    After all rounds: Head of Research synthesizes consensus.

    Returns dict update for HyperAlphaState.
    """
    ticker = state["ticker"]
    max_rounds = settings.max_debate_rounds
    llm = _get_llm()
    analyst_brief = _format_analyst_reports(state)
    debate_history: list[DebatePosition] = []

    log.info(
        "debate_start",
        ticker=ticker,
        max_rounds=max_rounds,
    )

    bear_prev_argument: Optional[str] = None

    for round_num in range(1, max_rounds + 1):
        # ── Bull argues ──
        bull_prompt = _build_bull_prompt(
            ticker=ticker,
            analyst_brief=analyst_brief,
            round_num=round_num,
            total_rounds=max_rounds,
            bear_prev=bear_prev_argument,
        )

        try:
            bull_response = llm.invoke([HumanMessage(content=bull_prompt)])
            bull_text = bull_response.content
        except Exception as exc:
            log.error("bull_llm_error", round=round_num, error=str(exc))
            bull_text = (
                "ARGUMENT: Unable to generate argument due to LLM error.\n"
                "CONVICTION: 0.5\nCONCESSIONS: None"
            )

        bull_conviction = _parse_conviction(bull_text)
        bull_argument = _parse_argument(bull_text)

        bull_position = DebatePosition(
            side="bull",
            argument=bull_argument,
            supporting_data=_parse_concessions(bull_text),
            conviction=bull_conviction,
            round_number=round_num,
        )
        debate_history.append(bull_position)

        log.info(
            "bull_argued",
            round=round_num,
            conviction=bull_conviction,
        )

        # ── Bear counters ──
        bear_prompt = _build_bear_prompt(
            ticker=ticker,
            analyst_brief=analyst_brief,
            round_num=round_num,
            total_rounds=max_rounds,
            bull_prev=bull_argument,
        )

        try:
            bear_response = llm.invoke([HumanMessage(content=bear_prompt)])
            bear_text = bear_response.content
        except Exception as exc:
            log.error("bear_llm_error", round=round_num, error=str(exc))
            bear_text = (
                "ARGUMENT: Unable to generate argument due to LLM error.\n"
                "CONVICTION: 0.5\nCONCESSIONS: None"
            )

        bear_conviction = _parse_conviction(bear_text)
        bear_argument = _parse_argument(bear_text)

        bear_position = DebatePosition(
            side="bear",
            argument=bear_argument,
            supporting_data=_parse_concessions(bear_text),
            conviction=bear_conviction,
            round_number=round_num,
        )
        debate_history.append(bear_position)
        bear_prev_argument = bear_argument

        log.info(
            "bear_countered",
            round=round_num,
            conviction=bear_conviction,
        )

        # ── Convergence check ──
        if _check_convergence(debate_history):
            log.info(
                "debate_converged_early",
                round=round_num,
                bull_conv=bull_conviction,
                bear_conv=bear_conviction,
            )
            break

    # ── Head of Research: consensus ──
    debate_quality = _compute_debate_quality(debate_history)

    bull_positions = [p for p in debate_history if p.side == "bull"]
    bear_positions = [p for p in debate_history if p.side == "bear"]
    bull_final = bull_positions[-1].conviction if bull_positions else 0.5
    bear_final = bear_positions[-1].conviction if bear_positions else 0.5

    consensus_prompt = _build_consensus_prompt(
        ticker=ticker,
        debate_history=debate_history,
        analyst_brief=analyst_brief,
    )

    try:
        consensus_response = llm.invoke(
            [HumanMessage(content=consensus_prompt)]
        )
        consensus_text = consensus_response.content
    except Exception as exc:
        log.error("consensus_llm_error", error=str(exc))
        consensus_text = (
            "CONSENSUS_SIGNAL: neutral\n"
            "CONSENSUS_CONFIDENCE: 0.5\n"
            "KEY_THESIS: Debate inconclusive due to LLM error.\n"
            "DECISIVE_FACTOR: Unable to determine."
        )

    consensus = _parse_consensus(
        text=consensus_text,
        bull_final_conviction=bull_final,
        bear_final_conviction=bear_final,
        debate_quality=debate_quality,
    )

    log.info(
        "debate_complete",
        ticker=ticker,
        signal=consensus.signal.value,
        confidence=consensus.confidence,
        debate_quality=debate_quality,
        rounds_completed=len(bull_positions),
        bull_final=bull_final,
        bear_final=bear_final,
    )

    return {
        "debate_history": debate_history,
        "debate_consensus": consensus,
    }
