"""HyperAlpha Layer 5 — Trader Agent."""
from __future__ import annotations

import re
from typing import Optional

import structlog
from langchain_anthropic import ChatAnthropic
from langchain_core.messages import HumanMessage

from hyperalpha.config import settings
from hyperalpha.types import (
    AnalystReport, DebateConsensus, HyperAlphaState,
    Market, Signal, StatArbSignal, StrategySignal, TradeRecommendation,
)

log = structlog.get_logger(__name__)


def _get_deep_llm() -> ChatAnthropic:
    return ChatAnthropic(
        model=settings.deep_think_model, api_key=settings.anthropic_api_key,
        timeout=settings.llm_timeout_seconds, max_retries=settings.llm_max_retries,
        temperature=0.3,
    )


def _collect_report(state: HyperAlphaState, key: str) -> Optional[AnalystReport]:
    return state.get(key)


def _format_reports(state: HyperAlphaState) -> str:
    sections: list[str] = []
    for label, key in [("Fundamentals", "fundamentals_report"), ("Sentiment", "sentiment_report"),
                       ("Technicals", "technicals_report"), ("Macro", "macro_report")]:
        report = _collect_report(state, key)
        if report is None:
            sections.append(f"[{label}] No data.")
            continue
        sections.append(f"[{label}] Signal={report.signal.value} Confidence={report.confidence:.0%} Quality={report.data_quality:.0%}\n  {report.reasoning}")
    return "\n".join(sections)


def _count_alignment(state: HyperAlphaState) -> tuple[int, str]:
    reports = [_collect_report(state, k) for k in ["fundamentals_report", "sentiment_report", "technicals_report", "macro_report"]]
    valid = [r for r in reports if r is not None]
    if not valid:
        return 0, "No analyst reports available."
    buy_count = sum(1 for r in valid if r.signal in (Signal.BUY, Signal.STRONG_BUY))
    sell_count = sum(1 for r in valid if r.signal in (Signal.SELL, Signal.STRONG_SELL))
    neutral_count = sum(1 for r in valid if r.signal == Signal.NEUTRAL)
    return max(buy_count, sell_count), f"Alignment: {buy_count} bullish, {sell_count} bearish, {neutral_count} neutral out of {len(valid)} analysts"


def _format_stat_arb(signals: list[StatArbSignal]) -> str:
    if not signals:
        return "No stat arb signals generated."
    return "\n".join(f"[{s.strategy_name}] {s.signal.value} confidence={s.confidence:.0%} expected_return={s.expected_return_pct:.1f}% z_score={s.z_score:.2f}" for s in signals)


def _format_strategy_signals(signals: list[StrategySignal]) -> str:
    if not signals:
        return "No strategy signals fired."
    lines: list[str] = []
    for s in signals:
        icon = "BULL" if s.direction == "bullish" else "BEAR"
        lines.append(f"[{icon}] {s.name} ({s.timeframe}, strength={s.strength:.0%}): {s.description}")
    return "\n".join(lines)


def _build_prompt(
    ticker: str, reports_text: str, consensus: Optional[DebateConsensus],
    stat_arb_text: str, strategy_sig_text: str,
    alignment_score: int, alignment_summary: str,
    market_data: dict, max_leverage: float,
) -> str:
    consensus_section = "No debate consensus available."
    if consensus is not None:
        consensus_section = (
            f"Signal: {consensus.signal.value}\nConfidence: {consensus.confidence:.0%}\n"
            f"Key Thesis: {consensus.key_thesis}\nDecisive Factor: {consensus.decisive_factor}\n"
            f"Debate Quality: {consensus.debate_quality:.2f}\n"
            f"Bull Final: {consensus.bull_final_conviction:.2f} | Bear Final: {consensus.bear_final_conviction:.2f}"
        )

    current_price = market_data.get("mid_price") or market_data.get("current_price") or "N/A"
    atr = market_data.get("atr_14") or market_data.get("atr") or "N/A"
    funding = market_data.get("funding_rate", "N/A")
    volume = market_data.get("volume_24h", "N/A")
    oi = market_data.get("open_interest", "N/A")
    spread = market_data.get("spread_bps", "N/A")

    return f"""You are the HEAD TRADER at the HyperAlpha HFT trading desk.
You are AGGRESSIVE and DECISIVE. Your job is to find alpha and take positions.
HOLD is only acceptable when signals genuinely conflict (2 buy, 2 sell).
If 3+ analysts agree on a direction, you MUST take that trade.
If the debate consensus has a clear winner, you MUST follow it.
You are paid to make money, not to sit on the sidelines.

Synthesize ALL inputs into a single trade recommendation for {ticker}.

== LIVE MARKET DATA ==
Current Price: ${current_price}
ATR(14): {atr}
Funding Rate: {funding}
24h Volume: ${volume}
Open Interest: ${oi}
Spread (bps): {spread}

== ANALYST REPORTS ==
{reports_text}

== SIGNAL ALIGNMENT ==
{alignment_summary}
Alignment score: {alignment_score}/4 analysts agree on direction

== STRATEGY SIGNALS (CONFLUENCE PATTERNS) ==
{strategy_sig_text}

== RESEARCH DEBATE CONSENSUS ==
{consensus_section}

== STATISTICAL ARBITRAGE SIGNALS ==
{stat_arb_text}

== DECISION FRAMEWORK ==
LEVERAGE FORMULA: leverage = 1.0 + (confidence - 0.5) * 2.5. HARD CAP: {max_leverage}x
STOP LOSS: stop_distance = 2.0 * ATR(14)
TAKE PROFIT: target 2:1 reward-to-risk minimum
POSITION SIZING: base=${settings.max_position_size_usd}, adjusted by confidence, reduced if alignment < 3

== REQUIRED OUTPUT FORMAT ==
ACTION: <long | short | hold | close>
ENTRY_PRICE: <price or "market">
STOP_LOSS: <price>
TAKE_PROFIT: <price>
SIZE_USD: <dollar amount>
LEVERAGE: <multiplier>
CONFIDENCE: <0.0 to 1.0>
TIME_HORIZON: <e.g. "4-8 hours">
REASONING: <3-5 sentences explaining the trade, catalyst, risk, and invalidation>

CRITICAL: If 3+ analysts agree, ACTION must be LONG or SHORT. ALWAYS provide exact prices."""


def _parse_recommendation(text: str, ticker: str, alignment_score: int) -> TradeRecommendation:
    def _ext(pattern: str, default: str = "") -> str:
        m = re.search(pattern, text, re.IGNORECASE)
        return m.group(1).strip() if m else default

    def _ext_f(pattern: str, default: Optional[float] = None) -> Optional[float]:
        m = re.search(pattern, text, re.IGNORECASE)
        if m:
            try:
                return float(m.group(1))
            except ValueError:
                return default
        return default

    action = _ext(r"ACTION\s*[:=]\s*(\w+)", "hold").lower()
    if action not in ("long", "short", "hold", "close"):
        action = "hold"

    entry_raw = _ext(r"ENTRY_PRICE\s*[:=]\s*([\d.]+|market)", "market")
    entry_price = float(entry_raw) if entry_raw != "market" else None
    leverage = _ext_f(r"LEVERAGE\s*[:=]\s*([\d.]+)", 1.0)
    if leverage is not None:
        leverage = min(leverage, settings.max_leverage)

    return TradeRecommendation(
        ticker=ticker, market=Market.PERP, action=action, entry_price=entry_price,
        take_profit=_ext_f(r"TAKE_PROFIT\s*[:=]\s*([\d.]+)"),
        stop_loss=_ext_f(r"STOP_LOSS\s*[:=]\s*([\d.]+)"),
        size_usd=_ext_f(r"SIZE_USD\s*[:=]\s*([\d.]+)"),
        leverage=leverage,
        confidence=min(1.0, max(0.0, _ext_f(r"CONFIDENCE\s*[:=]\s*([\d.]+)", 0.5) or 0.5)),
        reasoning=_ext(r"REASONING\s*[:=]\s*(.+(?:\n(?!(?:ACTION|ENTRY|STOP|TAKE|SIZE|LEVERAGE|CONFIDENCE|TIME|CRITICAL)).+)*)", "No reasoning parsed."),
        time_horizon=_ext(r"TIME_HORIZON\s*[:=]\s*(.*?)(?:\n|$)", ""),
        signal_alignment=alignment_score,
    )


def run_trader(state: HyperAlphaState) -> dict:
    """Layer 5: Trader agent synthesizes all inputs."""
    ticker = state["ticker"]
    market_data = state.get("market_data", {})
    consensus = state.get("debate_consensus")
    stat_arb_signals: list[StatArbSignal] = state.get("stat_arb_signals", [])
    strategy_signals: list[StrategySignal] = state.get("strategy_signals", [])

    reports_text = _format_reports(state)
    alignment_score, alignment_summary = _count_alignment(state)

    prompt = _build_prompt(
        ticker=ticker, reports_text=reports_text, consensus=consensus,
        stat_arb_text=_format_stat_arb(stat_arb_signals),
        strategy_sig_text=_format_strategy_signals(strategy_signals),
        alignment_score=alignment_score, alignment_summary=alignment_summary,
        market_data=market_data, max_leverage=settings.max_leverage,
    )

    try:
        response = _get_deep_llm().invoke([HumanMessage(content=prompt)])
        response_text = response.content
    except Exception as exc:
        log.error("trader_llm_error", error=str(exc))
        return {"trade_recommendation": TradeRecommendation(ticker=ticker, action="hold", reasoning=f"LLM error: {exc}", signal_alignment=alignment_score)}

    rec = _parse_recommendation(response_text, ticker, alignment_score)
    log.info("trader_recommendation", ticker=ticker, action=rec.action, confidence=rec.confidence, leverage=rec.leverage, size_usd=rec.size_usd, alignment=alignment_score)
    return {"trade_recommendation": rec}
