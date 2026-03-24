"""HyperAlpha Layer 6 — Risk Manager (VETO power)."""
from __future__ import annotations

import re
from typing import Optional

import structlog
from langchain_anthropic import ChatAnthropic
from langchain_core.messages import HumanMessage

from hyperalpha.config import settings
from hyperalpha.types import (
    HyperAlphaState, PortfolioState, RiskAssessment, TradeRecommendation,
)

log = structlog.get_logger(__name__)


def _get_quick_llm() -> ChatAnthropic:
    return ChatAnthropic(
        model=settings.quick_think_model, api_key=settings.anthropic_api_key,
        timeout=settings.llm_timeout_seconds, max_retries=settings.llm_max_retries,
        temperature=0.2,
    )


def _format_portfolio(portfolio: Optional[PortfolioState]) -> str:
    if portfolio is None:
        return "Portfolio state unavailable. Assume conservative defaults:\n  Equity: unknown, Leverage: 0x, Positions: 0"
    positions_text = "None"
    if portfolio.open_positions:
        pos_lines = [f"  - {p.get('ticker', '?')}: size=${p.get('size_usd', 0):.0f} PnL={p.get('unrealized_pnl', 0):+.2f} leverage={p.get('leverage', 1)}x" for p in portfolio.open_positions]
        positions_text = "\n".join(pos_lines)
    return (f"Total Equity: ${portfolio.total_equity:,.2f}\nMargin Used: ${portfolio.total_margin_used:,.2f}\n"
            f"Unrealized PnL: ${portfolio.unrealized_pnl:+,.2f}\nCurrent Portfolio Leverage: {portfolio.current_leverage:.2f}x\n"
            f"Open Positions ({portfolio.position_count}):\n{positions_text}")


def _build_prompt(rec: TradeRecommendation, portfolio_text: str, max_pos: float, max_dd: float, max_lev: float) -> str:
    return f"""You are the RISK MANAGER at the HyperAlpha trading desk.
You have VETO power. Your job is to protect the fund from excessive risk.

== PROPOSED TRADE ==
Ticker: {rec.ticker}
Action: {rec.action}
Entry: {rec.entry_price}
Stop Loss: {rec.stop_loss}
Take Profit: {rec.take_profit}
Size: ${rec.size_usd}
Leverage: {rec.leverage}x
Confidence: {rec.confidence:.0%}
Alignment: {rec.signal_alignment}/4 analysts agree
Reasoning: {rec.reasoning}

== CURRENT PORTFOLIO STATE ==
{portfolio_text}

== RISK LIMITS ==
Max Position Size: ${max_pos:,.0f}
Max Portfolio Drawdown: {max_dd}%
Max Leverage: {max_lev}x
Max Single Trade Risk: {settings.max_single_trade_risk_pct}% of equity

== KELLY CRITERION REFERENCE ==
f* = (p * b - q) / b, Half-Kelly recommended for crypto.

== EVALUATION CHECKLIST ==
1. Stop loss exists and reasonable? 2. Position size within limits?
3. Portfolio leverage OK? 4. Concentration risk? 5. Reward:risk >= 1.5:1?

== REQUIRED OUTPUT FORMAT ==
APPROVED: <true | false>
RISK_SCORE: <0.0 to 1.0>
ADJUSTED_SIZE: <USD or "no_change">
ADJUSTED_LEVERAGE: <value or "no_change">
MAX_DRAWDOWN_PCT: <estimated>
WARNINGS: <list any warnings>
VETO_REASON: <if APPROVED=false, why. Otherwise "none">"""


def _parse_assessment(text: str) -> RiskAssessment:
    def _ext(p: str, d: str = "") -> str:
        m = re.search(p, text, re.IGNORECASE)
        return m.group(1).strip() if m else d

    def _ext_f(p: str, d: float = 0.0) -> float:
        m = re.search(p, text, re.IGNORECASE)
        return float(m.group(1)) if m else d

    approved = _ext(r"APPROVED\s*[:=]\s*(\w+)", "false").lower() in ("true", "yes", "approved")
    risk_score = max(0.0, min(1.0, _ext_f(r"RISK_SCORE\s*[:=]\s*([\d.]+)", 0.5)))

    adj_size_raw = _ext(r"ADJUSTED_SIZE\s*[:=]\s*([\d.]+|no_change)", "no_change")
    adj_size: Optional[float] = None
    if adj_size_raw != "no_change":
        try:
            adj_size = float(adj_size_raw)
        except ValueError:
            pass

    adj_lev_raw = _ext(r"ADJUSTED_LEVERAGE\s*[:=]\s*([\d.]+|no_change)", "no_change")
    adj_lev: Optional[float] = None
    if adj_lev_raw != "no_change":
        try:
            adj_lev = float(adj_lev_raw)
        except ValueError:
            pass

    warnings_raw = _ext(r"WARNINGS\s*[:=]\s*(.*?)(?=\n(?:VETO_REASON)|$)")
    warnings = [w.strip().lstrip("•-*").strip() for w in warnings_raw.split("\n") if w.strip() and len(w.strip()) > 3]
    veto_raw = _ext(r"VETO_REASON\s*[:=]\s*(.*?)$")
    veto_reason = veto_raw if veto_raw.lower() not in ("none", "n/a", "") else None

    return RiskAssessment(approved=approved, risk_score=risk_score, position_size_adjusted=adj_size,
                          leverage_adjusted=adj_lev, warnings=warnings, veto_reason=veto_reason,
                          max_drawdown_pct=_ext_f(r"MAX_DRAWDOWN_PCT\s*[:=]\s*([\d.]+)", 0.0))


def run_risk_manager(state: HyperAlphaState) -> dict:
    """Layer 6: Risk manager evaluates the trade recommendation."""
    rec: Optional[TradeRecommendation] = state.get("trade_recommendation")
    portfolio: Optional[PortfolioState] = state.get("portfolio_state")

    if rec is None:
        return {"risk_assessment": RiskAssessment(approved=False, veto_reason="No trade recommendation.", warnings=["Missing input."])}
    if rec.action == "hold":
        log.info("risk_manager_hold_passthrough")
        return {"risk_assessment": RiskAssessment(approved=True, risk_score=0.0, warnings=["Hold action — no risk evaluation needed."])}

    prompt = _build_prompt(rec, _format_portfolio(portfolio), settings.max_position_size_usd, settings.max_portfolio_drawdown_pct, settings.max_leverage)

    try:
        response = _get_quick_llm().invoke([HumanMessage(content=prompt)])
        assessment = _parse_assessment(response.content)
    except Exception as exc:
        log.error("risk_manager_llm_error", error=str(exc))
        return {"risk_assessment": RiskAssessment(approved=False, risk_score=1.0, veto_reason=f"Risk evaluation failed: {exc}", warnings=["LLM error — VETO."])}

    # Hard safety overrides
    if rec.stop_loss is None and rec.action != "close":
        assessment.approved = False
        assessment.veto_reason = "VETO: No stop loss defined."
        assessment.warnings.append("Missing stop loss — mandatory.")
    if rec.leverage and rec.leverage > settings.max_leverage:
        assessment.leverage_adjusted = settings.max_leverage
        assessment.warnings.append(f"Leverage capped to {settings.max_leverage}x.")
    if rec.size_usd and rec.size_usd > settings.max_position_size_usd:
        assessment.position_size_adjusted = settings.max_position_size_usd
        assessment.warnings.append(f"Size capped to ${settings.max_position_size_usd:.0f}.")

    log.info("risk_assessment", approved=assessment.approved, risk_score=assessment.risk_score, veto_reason=assessment.veto_reason, warnings=assessment.warnings)
    return {"risk_assessment": assessment}
