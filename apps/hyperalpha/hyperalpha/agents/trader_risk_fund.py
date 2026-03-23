"""
HyperAlpha — Layers 4-7: Stat Arb Engine, Trader, Risk Manager, Fund Manager.

Layer 4: Statistical arbitrage signals (no LLM — pure math).
Layer 5: Trader agent synthesizes all inputs into a TradeRecommendation.
Layer 6: Risk Manager evaluates and can VETO trades.
Layer 7: Fund Manager gives final approval/rejection.
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
    FinalDecision,
    HyperAlphaState,
    Market,
    PortfolioState,
    RiskAssessment,
    Signal,
    StatArbSignal,
    TradeRecommendation,
)

log = structlog.get_logger(__name__)

SIGNAL_MAP: dict[str, Signal] = {
    "strong_buy": Signal.STRONG_BUY,
    "buy": Signal.BUY,
    "neutral": Signal.NEUTRAL,
    "sell": Signal.SELL,
    "strong_sell": Signal.STRONG_SELL,
}

MAX_EXPECTED_RETURN_PCT = 15.0


def _get_deep_llm() -> ChatAnthropic:
    return ChatAnthropic(
        model=settings.deep_think_model,
        api_key=settings.anthropic_api_key,
        timeout=settings.llm_timeout_seconds,
        max_retries=settings.llm_max_retries,
        temperature=0.3,
    )


def _get_quick_llm() -> ChatAnthropic:
    return ChatAnthropic(
        model=settings.quick_think_model,
        api_key=settings.anthropic_api_key,
        timeout=settings.llm_timeout_seconds,
        max_retries=settings.llm_max_retries,
        temperature=0.2,
    )


# ═══════════════════════════════════════════════════════════
# LAYER 4: Statistical Arbitrage Engine (No LLM)
# ═══════════════════════════════════════════════════════════


def _funding_rate_signal(market_data: dict) -> Optional[StatArbSignal]:
    """Contrarian funding rate arbitrage.

    When funding is extreme, the crowded side tends to unwind.
    Annualized funding = hourly_rate * 8760 (paid every 8 hours,
    so the 8h rate * 3 * 365 = hourly_rate * 8760 equivalent).
    """
    funding_rate = market_data.get("funding_rate")
    if funding_rate is None:
        return None

    # Annualized: 8h funding rate * 1095 (3 periods/day * 365 days)
    annualized = funding_rate * 1095
    ticker = market_data.get("ticker", "UNKNOWN")

    if abs(annualized) < 0.10:
        return None

    # Contrarian: extreme positive funding -> short bias (longs pay)
    if annualized > 0.30:
        signal = Signal.SELL
        confidence = min(0.8, 0.5 + abs(annualized) * 0.3)
    elif annualized < -0.30:
        signal = Signal.BUY
        confidence = min(0.8, 0.5 + abs(annualized) * 0.3)
    elif annualized > 0.10:
        signal = Signal.SELL
        confidence = 0.4
    else:
        signal = Signal.BUY
        confidence = 0.4

    volatility = market_data.get("volatility_24h", 0.02)
    raw_return = abs(annualized) * 0.1 / max(volatility, 0.005)
    expected_return = min(MAX_EXPECTED_RETURN_PCT, raw_return)

    return StatArbSignal(
        strategy_name="funding_rate_arb",
        pair=ticker,
        signal=signal,
        z_score=annualized / max(volatility, 0.005),
        expected_return_pct=round(expected_return, 2),
        holding_period_hours=8,
        confidence=round(confidence, 3),
        metadata={
            "funding_rate_8h": funding_rate,
            "annualized": round(annualized, 4),
        },
    )


def _mean_reversion_signal(market_data: dict) -> Optional[StatArbSignal]:
    """Mean reversion signal based on z-score.

    Only triggers when Hurst exponent < 0.5 (mean-reverting regime).
    """
    z_score = market_data.get("price_z_score")
    hurst = market_data.get("hurst_exponent")
    ticker = market_data.get("ticker", "UNKNOWN")

    if z_score is None or hurst is None:
        return None

    if hurst >= 0.5:
        log.debug(
            "mean_reversion_skipped",
            reason="trending_regime",
            hurst=hurst,
        )
        return None

    abs_z = abs(z_score)
    if abs_z < 1.5:
        return None

    if z_score > 2.0:
        signal = Signal.SELL
    elif z_score > 1.5:
        signal = Signal.SELL
    elif z_score < -2.0:
        signal = Signal.BUY
    else:
        signal = Signal.BUY

    confidence = min(0.85, 0.4 + abs_z * 0.15)
    # Mean-reverting strength scales with how mean-reverting the regime is
    reversion_strength = (0.5 - hurst) * 2  # 0..1
    volatility = market_data.get("volatility_24h", 0.02)
    raw_return = abs_z * reversion_strength * 5.0 / max(volatility, 0.005)
    expected_return = min(MAX_EXPECTED_RETURN_PCT, raw_return)

    return StatArbSignal(
        strategy_name="mean_reversion",
        pair=ticker,
        signal=signal,
        z_score=round(z_score, 3),
        expected_return_pct=round(expected_return, 2),
        holding_period_hours=24,
        confidence=round(confidence, 3),
        metadata={
            "hurst_exponent": hurst,
            "reversion_strength": round(reversion_strength, 3),
        },
    )


def _order_book_imbalance_signal(
    market_data: dict,
) -> Optional[StatArbSignal]:
    """Short-term signal from bid/ask imbalance in the order book."""
    bid_depth = market_data.get("bid_depth_usd")
    ask_depth = market_data.get("ask_depth_usd")
    ticker = market_data.get("ticker", "UNKNOWN")

    if bid_depth is None or ask_depth is None:
        return None

    total = bid_depth + ask_depth
    if total < 1000:
        return None

    imbalance = (bid_depth - ask_depth) / total  # -1 to +1

    if abs(imbalance) < 0.15:
        return None

    if imbalance > 0.30:
        signal = Signal.BUY
        confidence = min(0.7, 0.4 + imbalance * 0.5)
    elif imbalance > 0.15:
        signal = Signal.BUY
        confidence = 0.35
    elif imbalance < -0.30:
        signal = Signal.SELL
        confidence = min(0.7, 0.4 + abs(imbalance) * 0.5)
    else:
        signal = Signal.SELL
        confidence = 0.35

    volatility = market_data.get("volatility_24h", 0.02)
    raw_return = abs(imbalance) * 3.0 / max(volatility, 0.005)
    expected_return = min(MAX_EXPECTED_RETURN_PCT, raw_return)

    return StatArbSignal(
        strategy_name="order_book_imbalance",
        pair=ticker,
        signal=signal,
        z_score=round(imbalance / 0.15, 3),
        expected_return_pct=round(expected_return, 2),
        holding_period_hours=4,
        confidence=round(confidence, 3),
        metadata={"imbalance_ratio": round(imbalance, 4)},
    )


def run_stat_arb(state: HyperAlphaState) -> dict:
    """Layer 4: Run all stat arb strategies and return signals."""
    market_data = state.get("market_data", {})
    signals: list[StatArbSignal] = []

    generators = [
        _funding_rate_signal,
        _mean_reversion_signal,
        _order_book_imbalance_signal,
    ]

    for gen in generators:
        try:
            sig = gen(market_data)
            if sig is not None:
                signals.append(sig)
                log.info(
                    "stat_arb_signal",
                    strategy=sig.strategy_name,
                    signal=sig.signal.value,
                    confidence=sig.confidence,
                    expected_return=sig.expected_return_pct,
                )
        except Exception as exc:
            log.error(
                "stat_arb_error",
                strategy=gen.__name__,
                error=str(exc),
            )

    log.info("stat_arb_complete", signal_count=len(signals))
    return {"stat_arb_signals": signals}


# ═══════════════════════════════════════════════════════════
# LAYER 5: Trader Agent
# ═══════════════════════════════════════════════════════════


def _collect_report(state: HyperAlphaState, key: str) -> Optional[AnalystReport]:
    """Safely retrieve an analyst report from state."""
    return state.get(key)


def _format_reports_for_trader(state: HyperAlphaState) -> str:
    """Format all analyst reports for the trader prompt."""
    sections: list[str] = []
    report_keys = [
        ("Fundamentals", "fundamentals_report"),
        ("Sentiment", "sentiment_report"),
        ("Technicals", "technicals_report"),
        ("Macro", "macro_report"),
    ]
    for label, key in report_keys:
        report = _collect_report(state, key)
        if report is None:
            sections.append(f"[{label}] No data.")
            continue
        sections.append(
            f"[{label}] Signal={report.signal.value} "
            f"Confidence={report.confidence:.0%} "
            f"Quality={report.data_quality:.0%}\n"
            f"  {report.reasoning}"
        )
    return "\n".join(sections)


def _count_signal_alignment(state: HyperAlphaState) -> tuple[int, str]:
    """Count how many analyst signals agree and return summary."""
    reports: list[Optional[AnalystReport]] = [
        _collect_report(state, k)
        for k in [
            "fundamentals_report",
            "sentiment_report",
            "technicals_report",
            "macro_report",
        ]
    ]
    valid = [r for r in reports if r is not None]
    if not valid:
        return 0, "No analyst reports available."

    buy_count = sum(
        1 for r in valid if r.signal in (Signal.BUY, Signal.STRONG_BUY)
    )
    sell_count = sum(
        1 for r in valid if r.signal in (Signal.SELL, Signal.STRONG_SELL)
    )
    neutral_count = sum(1 for r in valid if r.signal == Signal.NEUTRAL)

    summary = (
        f"Alignment: {buy_count} bullish, {sell_count} bearish, "
        f"{neutral_count} neutral out of {len(valid)} analysts"
    )
    alignment = max(buy_count, sell_count)
    return alignment, summary


def _format_stat_arb_for_trader(
    signals: list[StatArbSignal],
) -> str:
    """Format stat arb signals for the trader prompt."""
    if not signals:
        return "No stat arb signals generated."
    lines: list[str] = []
    for sig in signals:
        lines.append(
            f"[{sig.strategy_name}] {sig.signal.value} "
            f"confidence={sig.confidence:.0%} "
            f"expected_return={sig.expected_return_pct:.1f}% "
            f"z_score={sig.z_score:.2f}"
        )
    return "\n".join(lines)


def _build_trader_prompt(
    ticker: str,
    reports_text: str,
    consensus: Optional[DebateConsensus],
    stat_arb_text: str,
    alignment_score: int,
    alignment_summary: str,
    market_data: dict,
    max_leverage: float,
) -> str:
    """Build the trader agent prompt with explicit formulas."""
    consensus_section = "No debate consensus available."
    if consensus is not None:
        consensus_section = (
            f"Signal: {consensus.signal.value}\n"
            f"Confidence: {consensus.confidence:.0%}\n"
            f"Key Thesis: {consensus.key_thesis}\n"
            f"Decisive Factor: {consensus.decisive_factor}\n"
            f"Debate Quality: {consensus.debate_quality:.2f}\n"
            f"Bull Final: {consensus.bull_final_conviction:.2f} | "
            f"Bear Final: {consensus.bear_final_conviction:.2f}"
        )

    current_price = market_data.get("current_price", "N/A")
    atr = market_data.get("atr_14", "N/A")

    return f"""You are the HEAD TRADER at the HyperAlpha HFT trading desk.
You are AGGRESSIVE and DECISIVE. Your job is to find alpha and take positions.
HOLD is only acceptable when signals genuinely conflict (2 buy, 2 sell).
If 3+ analysts agree on a direction, you MUST take that trade.
If the debate consensus has a clear winner, you MUST follow it.
You are paid to make money, not to sit on the sidelines.

Synthesize ALL inputs into a single trade recommendation for {ticker}.

== LIVE MARKET DATA ==
Current Price: {current_price}
ATR(14): {atr}

== ANALYST REPORTS ==
{reports_text}

== SIGNAL ALIGNMENT ==
{alignment_summary}
Alignment score: {alignment_score}/4 analysts agree on direction

== RESEARCH DEBATE CONSENSUS ==
{consensus_section}

== STATISTICAL ARBITRAGE SIGNALS ==
{stat_arb_text}

== DECISION FRAMEWORK ==

LEVERAGE FORMULA (follow exactly):
- Confidence 0.50 -> 1.0x leverage
- Confidence 0.70 -> 1.5x leverage
- Confidence 0.90 -> 2.0x leverage
- Formula: leverage = 1.0 + (confidence - 0.5) * 2.5
- HARD CAP: {max_leverage}x maximum regardless of confidence

STOP LOSS FORMULA (ATR-based):
- Stop distance = 2.0 * ATR(14)
- For LONG: stop_loss = entry_price - (2.0 * ATR)
- For SHORT: stop_loss = entry_price + (2.0 * ATR)
- Example: if price=100, ATR=3.5, LONG stop = 100 - 7.0 = 93.0

TAKE PROFIT: target 2:1 reward-to-risk minimum
- take_profit distance = stop_distance * 2.0 (at minimum)

POSITION SIZING:
- Base size = ${settings.max_position_size_usd}
- Adjusted by confidence: size = base * confidence
- Reduced if alignment < 3: size *= 0.75

== REQUIRED OUTPUT FORMAT ==
ACTION: <long | short | hold | close>
ENTRY_PRICE: <price or "market">
STOP_LOSS: <price>
TAKE_PROFIT: <price>
SIZE_USD: <dollar amount>
LEVERAGE: <multiplier, e.g. 1.5>
CONFIDENCE: <0.0 to 1.0>
TIME_HORIZON: <e.g. "4-8 hours", "1-3 days">
REASONING: <3-5 sentences explaining WHY this trade, what catalyst you see, what the risk is, and what would invalidate the thesis>

CRITICAL RULES:
- If 3+ analysts say BUY, your ACTION must be LONG (not HOLD)
- If 3+ analysts say SELL, your ACTION must be SHORT (not HOLD)
- ALWAYS provide exact entry_price (use current market price), stop_loss, and take_profit
- NEVER output ACTION: hold if there is a clear directional bias
- The REASONING must explain the specific edge you see in this trade"""


def _parse_trade_recommendation(
    text: str,
    ticker: str,
    alignment_score: int,
) -> TradeRecommendation:
    """Parse the trader LLM output into a TradeRecommendation."""

    def _extract(pattern: str, default: str = "") -> str:
        match = re.search(pattern, text, re.IGNORECASE)
        return match.group(1).strip() if match else default

    def _extract_float(pattern: str, default: Optional[float] = None) -> Optional[float]:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            try:
                return float(match.group(1))
            except ValueError:
                return default
        return default

    action_str = _extract(r"ACTION\s*[:=]\s*(\w+)", "hold").lower()
    if action_str not in ("long", "short", "hold", "close"):
        action_str = "hold"

    entry_raw = _extract(r"ENTRY_PRICE\s*[:=]\s*([\d.]+|market)", "market")
    entry_price = (
        float(entry_raw) if entry_raw != "market" else None
    )

    leverage = _extract_float(r"LEVERAGE\s*[:=]\s*([\d.]+)", 1.0)
    if leverage is not None:
        leverage = min(leverage, settings.max_leverage)

    return TradeRecommendation(
        ticker=ticker,
        market=Market.PERP,
        action=action_str,
        entry_price=entry_price,
        take_profit=_extract_float(r"TAKE_PROFIT\s*[:=]\s*([\d.]+)"),
        stop_loss=_extract_float(r"STOP_LOSS\s*[:=]\s*([\d.]+)"),
        size_usd=_extract_float(r"SIZE_USD\s*[:=]\s*([\d.]+)"),
        leverage=leverage,
        confidence=min(
            1.0,
            max(0.0, _extract_float(r"CONFIDENCE\s*[:=]\s*([\d.]+)", 0.5) or 0.5),
        ),
        reasoning=_extract(
            r"REASONING\s*[:=]\s*(.+(?:\n(?!(?:ACTION|ENTRY|STOP|TAKE|SIZE|LEVERAGE|CONFIDENCE|TIME|CRITICAL)).+)*)",
            "No reasoning parsed."
        ),
        time_horizon=_extract(r"TIME_HORIZON\s*[:=]\s*(.*?)(?:\n|$)", ""),
        signal_alignment=alignment_score,
    )


def run_trader(state: HyperAlphaState) -> dict:
    """Layer 5: Trader agent synthesizes all inputs."""
    ticker = state["ticker"]
    market_data = state.get("market_data", {})
    consensus: Optional[DebateConsensus] = state.get("debate_consensus")
    stat_arb_signals: list[StatArbSignal] = state.get("stat_arb_signals", [])

    reports_text = _format_reports_for_trader(state)
    alignment_score, alignment_summary = _count_signal_alignment(state)
    stat_arb_text = _format_stat_arb_for_trader(stat_arb_signals)

    prompt = _build_trader_prompt(
        ticker=ticker,
        reports_text=reports_text,
        consensus=consensus,
        stat_arb_text=stat_arb_text,
        alignment_score=alignment_score,
        alignment_summary=alignment_summary,
        market_data=market_data,
        max_leverage=settings.max_leverage,
    )

    llm = _get_deep_llm()

    try:
        response = llm.invoke([HumanMessage(content=prompt)])
        response_text = response.content
    except Exception as exc:
        log.error("trader_llm_error", error=str(exc))
        return {
            "trade_recommendation": TradeRecommendation(
                ticker=ticker,
                action="hold",
                reasoning=f"LLM error: {exc}",
                signal_alignment=alignment_score,
            ),
        }

    recommendation = _parse_trade_recommendation(
        text=response_text,
        ticker=ticker,
        alignment_score=alignment_score,
    )

    log.info(
        "trader_recommendation",
        ticker=ticker,
        action=recommendation.action,
        confidence=recommendation.confidence,
        leverage=recommendation.leverage,
        size_usd=recommendation.size_usd,
        alignment=alignment_score,
    )

    return {"trade_recommendation": recommendation}


# ═══════════════════════════════════════════════════════════
# LAYER 6: Risk Manager (VETO power)
# ═══════════════════════════════════════════════════════════


def _format_portfolio_state(
    portfolio: Optional[PortfolioState],
) -> str:
    """Format portfolio state for the risk manager prompt."""
    if portfolio is None:
        return (
            "Portfolio state unavailable. Assume conservative defaults:\n"
            "  Equity: unknown, Leverage: 0x, Positions: 0"
        )

    positions_text = "None"
    if portfolio.open_positions:
        pos_lines = []
        for pos in portfolio.open_positions:
            pos_lines.append(
                f"  - {pos.get('ticker', '?')}: "
                f"size=${pos.get('size_usd', 0):.0f} "
                f"PnL={pos.get('unrealized_pnl', 0):+.2f} "
                f"leverage={pos.get('leverage', 1)}x"
            )
        positions_text = "\n".join(pos_lines)

    return (
        f"Total Equity: ${portfolio.total_equity:,.2f}\n"
        f"Margin Used: ${portfolio.total_margin_used:,.2f}\n"
        f"Unrealized PnL: ${portfolio.unrealized_pnl:+,.2f}\n"
        f"Current Portfolio Leverage: {portfolio.current_leverage:.2f}x\n"
        f"Open Positions ({portfolio.position_count}):\n{positions_text}"
    )


def _build_risk_prompt(
    recommendation: TradeRecommendation,
    portfolio_text: str,
    max_position_size: float,
    max_drawdown_pct: float,
    max_leverage: float,
) -> str:
    """Build the risk manager prompt with portfolio data and Kelly reference."""
    return f"""You are the RISK MANAGER at the HyperAlpha trading desk.
You have VETO power. Your job is to protect the fund from excessive risk.

== PROPOSED TRADE ==
Ticker: {recommendation.ticker}
Action: {recommendation.action}
Entry: {recommendation.entry_price}
Stop Loss: {recommendation.stop_loss}
Take Profit: {recommendation.take_profit}
Size: ${recommendation.size_usd}
Leverage: {recommendation.leverage}x
Confidence: {recommendation.confidence:.0%}
Alignment: {recommendation.signal_alignment}/4 analysts agree
Reasoning: {recommendation.reasoning}

== CURRENT PORTFOLIO STATE ==
{portfolio_text}

== RISK LIMITS ==
Max Position Size: ${max_position_size:,.0f}
Max Portfolio Drawdown: {max_drawdown_pct}%
Max Leverage: {max_leverage}x
Max Single Trade Risk: {settings.max_single_trade_risk_pct}% of equity

== KELLY CRITERION REFERENCE ==
Optimal position size (Kelly): f* = (p * b - q) / b
Where p = win_probability (use confidence), b = reward/risk ratio, q = 1-p
Half-Kelly is recommended for crypto due to fat tails.
Use this to validate whether the proposed size is reasonable.

== EVALUATION CHECKLIST ==
1. Does the stop loss exist? Is it reasonable (within 2-3 ATR)?
2. Is position size within limits?
3. Does adding this trade push portfolio leverage above {max_leverage}x?
4. Is the trade correlated with existing positions (concentration risk)?
5. Is the reward:risk ratio at least 1.5:1?
6. Would a loss on this trade exceed {settings.max_single_trade_risk_pct}% of equity?

== REQUIRED OUTPUT FORMAT ==
APPROVED: <true | false>
RISK_SCORE: <0.0 to 1.0, where 1.0 = maximum risk>
ADJUSTED_SIZE: <adjusted position size in USD, or "no_change">
ADJUSTED_LEVERAGE: <adjusted leverage, or "no_change">
MAX_DRAWDOWN_PCT: <estimated max drawdown percentage>
WARNINGS: <list any risk warnings, one per line>
VETO_REASON: <if APPROVED=false, explain why. Otherwise "none">"""


def _parse_risk_assessment(text: str) -> RiskAssessment:
    """Parse risk manager LLM output into RiskAssessment."""

    def _extract(pattern: str, default: str = "") -> str:
        match = re.search(pattern, text, re.IGNORECASE)
        return match.group(1).strip() if match else default

    def _extract_float(pattern: str, default: float = 0.0) -> float:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            try:
                return float(match.group(1))
            except ValueError:
                return default
        return default

    approved_str = _extract(r"APPROVED\s*[:=]\s*(\w+)", "false").lower()
    approved = approved_str in ("true", "yes", "approved")

    risk_score = _extract_float(r"RISK_SCORE\s*[:=]\s*([\d.]+)", 0.5)
    risk_score = max(0.0, min(1.0, risk_score))

    adj_size_raw = _extract(r"ADJUSTED_SIZE\s*[:=]\s*([\d.]+|no_change)", "no_change")
    adj_size: Optional[float] = None
    if adj_size_raw != "no_change":
        try:
            adj_size = float(adj_size_raw)
        except ValueError:
            pass

    adj_lev_raw = _extract(r"ADJUSTED_LEVERAGE\s*[:=]\s*([\d.]+|no_change)", "no_change")
    adj_leverage: Optional[float] = None
    if adj_lev_raw != "no_change":
        try:
            adj_leverage = float(adj_lev_raw)
        except ValueError:
            pass

    max_dd = _extract_float(r"MAX_DRAWDOWN_PCT\s*[:=]\s*([\d.]+)", 0.0)

    warnings_raw = _extract(r"WARNINGS\s*[:=]\s*(.*?)(?=\n(?:VETO_REASON)|$)")
    warnings = [
        w.strip().lstrip("•-*").strip()
        for w in warnings_raw.split("\n")
        if w.strip() and len(w.strip()) > 3
    ]

    veto_raw = _extract(r"VETO_REASON\s*[:=]\s*(.*?)$")
    veto_reason: Optional[str] = None
    if veto_raw.lower() not in ("none", "n/a", ""):
        veto_reason = veto_raw

    return RiskAssessment(
        approved=approved,
        risk_score=risk_score,
        position_size_adjusted=adj_size,
        leverage_adjusted=adj_leverage,
        warnings=warnings,
        veto_reason=veto_reason,
        max_drawdown_pct=max_dd,
    )


def run_risk_manager(state: HyperAlphaState) -> dict:
    """Layer 6: Risk manager evaluates the trade recommendation."""
    recommendation: Optional[TradeRecommendation] = state.get(
        "trade_recommendation"
    )
    portfolio: Optional[PortfolioState] = state.get("portfolio_state")

    if recommendation is None:
        log.warning("risk_manager_no_recommendation")
        return {
            "risk_assessment": RiskAssessment(
                approved=False,
                veto_reason="No trade recommendation to evaluate.",
                warnings=["Missing trade recommendation input."],
            ),
        }

    if recommendation.action == "hold":
        log.info("risk_manager_hold_passthrough")
        return {
            "risk_assessment": RiskAssessment(
                approved=True,
                risk_score=0.0,
                warnings=["Hold action — no risk evaluation needed."],
            ),
        }

    portfolio_text = _format_portfolio_state(portfolio)

    prompt = _build_risk_prompt(
        recommendation=recommendation,
        portfolio_text=portfolio_text,
        max_position_size=settings.max_position_size_usd,
        max_drawdown_pct=settings.max_portfolio_drawdown_pct,
        max_leverage=settings.max_leverage,
    )

    llm = _get_quick_llm()

    try:
        response = llm.invoke([HumanMessage(content=prompt)])
        response_text = response.content
    except Exception as exc:
        log.error("risk_manager_llm_error", error=str(exc))
        return {
            "risk_assessment": RiskAssessment(
                approved=False,
                risk_score=1.0,
                veto_reason=f"Risk evaluation failed: {exc}",
                warnings=["LLM error — defaulting to VETO for safety."],
            ),
        }

    assessment = _parse_risk_assessment(response_text)

    # Hard-coded safety overrides
    if recommendation.stop_loss is None and recommendation.action != "close":
        assessment.approved = False
        assessment.veto_reason = (
            "VETO: No stop loss defined. All trades require a stop loss."
        )
        assessment.warnings.append("Missing stop loss — mandatory per policy.")

    if recommendation.leverage is not None and recommendation.leverage > settings.max_leverage:
        assessment.leverage_adjusted = settings.max_leverage
        assessment.warnings.append(
            f"Leverage capped from {recommendation.leverage}x "
            f"to {settings.max_leverage}x per risk limits."
        )

    if recommendation.size_usd is not None and recommendation.size_usd > settings.max_position_size_usd:
        assessment.position_size_adjusted = settings.max_position_size_usd
        assessment.warnings.append(
            f"Position size capped from ${recommendation.size_usd:.0f} "
            f"to ${settings.max_position_size_usd:.0f} per risk limits."
        )

    log.info(
        "risk_assessment",
        approved=assessment.approved,
        risk_score=assessment.risk_score,
        veto_reason=assessment.veto_reason,
        warnings=assessment.warnings,
    )

    return {"risk_assessment": assessment}


# ═══════════════════════════════════════════════════════════
# LAYER 7: Fund Manager (Final Approval Gate)
# ═══════════════════════════════════════════════════════════


def _build_fund_manager_prompt(
    recommendation: TradeRecommendation,
    risk_assessment: RiskAssessment,
    consensus: Optional[DebateConsensus],
    portfolio_text: str,
) -> str:
    """Build fund manager prompt with weighted signal aggregation."""
    consensus_section = "No debate consensus available."
    debate_quality = 0.0
    if consensus is not None:
        debate_quality = consensus.debate_quality
        consensus_section = (
            f"Signal: {consensus.signal.value}\n"
            f"Confidence: {consensus.confidence:.0%}\n"
            f"Key Thesis: {consensus.key_thesis}\n"
            f"Debate Quality: {debate_quality:.2f}/1.00\n"
            f"Decisive Factor: {consensus.decisive_factor}"
        )

    # Build weighted signal summary
    signals_text = (
        f"Trader confidence: {recommendation.confidence:.0%}\n"
        f"Analyst alignment: {recommendation.signal_alignment}/4\n"
        f"Risk score: {risk_assessment.risk_score:.2f}"
    )
    if consensus is not None:
        weighted_confidence = (
            recommendation.confidence * 0.4
            + consensus.confidence * 0.3
            + (1.0 - risk_assessment.risk_score) * 0.3
        )
        signals_text += (
            f"\nDebate consensus confidence: {consensus.confidence:.0%}\n"
            f"Weighted aggregate confidence: {weighted_confidence:.0%}"
        )

    # Apply risk adjustments
    effective_size = recommendation.size_usd
    if risk_assessment.position_size_adjusted is not None:
        effective_size = risk_assessment.position_size_adjusted
    effective_leverage = recommendation.leverage
    if risk_assessment.leverage_adjusted is not None:
        effective_leverage = risk_assessment.leverage_adjusted

    return f"""You are the FUND MANAGER at the HyperAlpha trading desk.
You make the FINAL decision on whether to execute this trade.

== TRADE RECOMMENDATION ==
Ticker: {recommendation.ticker}
Action: {recommendation.action}
Entry: {recommendation.entry_price}
Stop Loss: {recommendation.stop_loss}
Take Profit: {recommendation.take_profit}
Original Size: ${recommendation.size_usd}
Effective Size (after risk adj): ${effective_size}
Original Leverage: {recommendation.leverage}x
Effective Leverage (after risk adj): {effective_leverage}x
Reasoning: {recommendation.reasoning}

== RISK ASSESSMENT ==
Risk Approved: {risk_assessment.approved}
Risk Score: {risk_assessment.risk_score:.2f}
Veto Reason: {risk_assessment.veto_reason or "None"}
Warnings: {'; '.join(risk_assessment.warnings) if risk_assessment.warnings else 'None'}

== RESEARCH DEBATE CONSENSUS ==
{consensus_section}

== WEIGHTED SIGNAL AGGREGATION ==
{signals_text}

== CURRENT PORTFOLIO ==
{portfolio_text}

== DEBATE QUALITY CONSIDERATION ==
Debate quality score: {debate_quality:.2f}/1.00
- Quality > 0.7: High conviction in debate outcome, weight consensus heavily
- Quality 0.4-0.7: Moderate debate, use consensus as supporting factor
- Quality < 0.4: Low quality debate, rely more on quantitative signals

== DECISION CRITERIA ==
1. If risk manager VETOED: you should almost always reject (override only with strong justification)
2. If debate quality < 0.3 AND confidence < 0.6: reject
3. If alignment < 2/4 AND no strong stat arb signal: reject
4. Approve if: risk approved, confidence > threshold, thesis is coherent

== REQUIRED OUTPUT FORMAT ==
DECISION: APPROVE
or
DECISION: REJECT

NOTES: <Your reasoning for the decision in 2-3 sentences>

== EXAMPLES ==
DECISION: APPROVE
NOTES: Strong alignment across 3/4 analysts, debate quality is high at 0.82, and risk score is acceptable at 0.35. Proceeding with risk-adjusted size.

DECISION: REJECT
NOTES: Risk manager vetoed due to missing stop loss. Additionally, debate quality was low at 0.28 indicating unclear thesis."""


def _parse_fund_decision(
    text: str,
    recommendation: TradeRecommendation,
    risk_assessment: RiskAssessment,
) -> FinalDecision:
    """Parse fund manager decision with explicit DECISION field matching."""
    # Explicit DECISION: field parsing
    decision_match = re.search(
        r"DECISION\s*[:=]\s*(APPROVE|REJECT)",
        text,
        re.IGNORECASE,
    )

    if decision_match:
        decision_str = decision_match.group(1).strip().upper()
        approved = decision_str == "APPROVE"
    else:
        # Strict fallback: if we can't parse DECISION, reject for safety
        log.warning(
            "fund_decision_parse_failed",
            text_preview=text[:300],
        )
        approved = False

    notes_match = re.search(
        r"NOTES\s*[:=]\s*(.*?)$",
        text,
        re.DOTALL | re.IGNORECASE,
    )
    notes = notes_match.group(1).strip() if notes_match else text.strip()

    # Apply risk adjustments to recommendation
    final_rec = TradeRecommendation(
        recommendation_id=recommendation.recommendation_id,
        ticker=recommendation.ticker,
        market=recommendation.market,
        action=recommendation.action,
        entry_price=recommendation.entry_price,
        take_profit=recommendation.take_profit,
        stop_loss=recommendation.stop_loss,
        size_usd=(
            risk_assessment.position_size_adjusted
            if risk_assessment.position_size_adjusted is not None
            else recommendation.size_usd
        ),
        leverage=(
            risk_assessment.leverage_adjusted
            if risk_assessment.leverage_adjusted is not None
            else recommendation.leverage
        ),
        confidence=recommendation.confidence,
        reasoning=recommendation.reasoning,
        time_horizon=recommendation.time_horizon,
        signal_alignment=recommendation.signal_alignment,
    )

    return FinalDecision(
        approved=approved,
        recommendation=final_rec,
        risk_assessment=risk_assessment,
        fund_manager_notes=notes,
        execution_ready=approved and risk_assessment.approved,
    )


def run_fund_manager(state: HyperAlphaState) -> dict:
    """Layer 7: Fund manager makes the final approval decision."""
    recommendation: Optional[TradeRecommendation] = state.get(
        "trade_recommendation"
    )
    risk_assessment: Optional[RiskAssessment] = state.get("risk_assessment")
    consensus: Optional[DebateConsensus] = state.get("debate_consensus")
    portfolio: Optional[PortfolioState] = state.get("portfolio_state")

    if recommendation is None:
        log.warning("fund_manager_no_recommendation")
        return {
            "final_decision": FinalDecision(
                approved=False,
                fund_manager_notes="No trade recommendation to evaluate.",
            ),
        }

    if risk_assessment is None:
        log.warning("fund_manager_no_risk_assessment")
        return {
            "final_decision": FinalDecision(
                approved=False,
                recommendation=recommendation,
                fund_manager_notes="No risk assessment — cannot approve.",
            ),
        }

    if recommendation.action == "hold":
        log.info("fund_manager_hold_passthrough")
        return {
            "final_decision": FinalDecision(
                approved=True,
                recommendation=recommendation,
                risk_assessment=risk_assessment,
                fund_manager_notes="Hold action — no execution needed.",
                execution_ready=False,
            ),
        }

    portfolio_text = _format_portfolio_state(portfolio)

    prompt = _build_fund_manager_prompt(
        recommendation=recommendation,
        risk_assessment=risk_assessment,
        consensus=consensus,
        portfolio_text=portfolio_text,
    )

    llm = _get_quick_llm()

    try:
        response = llm.invoke([HumanMessage(content=prompt)])
        response_text = response.content
    except Exception as exc:
        log.error("fund_manager_llm_error", error=str(exc))
        return {
            "final_decision": FinalDecision(
                approved=False,
                recommendation=recommendation,
                risk_assessment=risk_assessment,
                fund_manager_notes=f"LLM error — rejecting for safety: {exc}",
            ),
        }

    decision = _parse_fund_decision(
        text=response_text,
        recommendation=recommendation,
        risk_assessment=risk_assessment,
    )

    log.info(
        "fund_decision",
        ticker=recommendation.ticker,
        approved=decision.approved,
        execution_ready=decision.execution_ready,
        action=recommendation.action,
        notes=decision.fund_manager_notes[:200],
    )

    return {"final_decision": decision}
