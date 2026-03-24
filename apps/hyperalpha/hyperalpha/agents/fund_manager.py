"""HyperAlpha Layer 7 — Fund Manager (Final Approval Gate)."""
from __future__ import annotations

import re
from typing import Optional

import structlog
from langchain_anthropic import ChatAnthropic
from langchain_core.messages import HumanMessage

from hyperalpha.config import settings
from hyperalpha.types import (
    DebateConsensus, FinalDecision, HyperAlphaState,
    PortfolioState, RiskAssessment, TradeRecommendation,
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
        return "Portfolio state unavailable."
    return (f"Total Equity: ${portfolio.total_equity:,.2f}\nMargin Used: ${portfolio.total_margin_used:,.2f}\n"
            f"Unrealized PnL: ${portfolio.unrealized_pnl:+,.2f}\nLeverage: {portfolio.current_leverage:.2f}x\n"
            f"Positions: {portfolio.position_count}")


def _build_prompt(rec: TradeRecommendation, risk: RiskAssessment, consensus: Optional[DebateConsensus], portfolio_text: str) -> str:
    consensus_section = "No debate consensus available."
    debate_quality = 0.0
    if consensus is not None:
        debate_quality = consensus.debate_quality
        consensus_section = (f"Signal: {consensus.signal.value}\nConfidence: {consensus.confidence:.0%}\n"
                             f"Key Thesis: {consensus.key_thesis}\nDebate Quality: {debate_quality:.2f}/1.00\n"
                             f"Decisive Factor: {consensus.decisive_factor}")

    signals_text = f"Trader confidence: {rec.confidence:.0%}\nAnalyst alignment: {rec.signal_alignment}/4\nRisk score: {risk.risk_score:.2f}"
    if consensus is not None:
        weighted = rec.confidence * 0.4 + consensus.confidence * 0.3 + (1.0 - risk.risk_score) * 0.3
        signals_text += f"\nDebate consensus confidence: {consensus.confidence:.0%}\nWeighted aggregate confidence: {weighted:.0%}"

    eff_size = risk.position_size_adjusted if risk.position_size_adjusted is not None else rec.size_usd
    eff_lev = risk.leverage_adjusted if risk.leverage_adjusted is not None else rec.leverage

    return f"""You are the FUND MANAGER at the HyperAlpha trading desk. You make the FINAL decision.

== TRADE RECOMMENDATION ==
Ticker: {rec.ticker}, Action: {rec.action}, Entry: {rec.entry_price}, SL: {rec.stop_loss}, TP: {rec.take_profit}
Size: ${eff_size}, Leverage: {eff_lev}x
Reasoning: {rec.reasoning}

== RISK ASSESSMENT ==
Approved: {risk.approved}, Risk Score: {risk.risk_score:.2f}
Veto: {risk.veto_reason or "None"}, Warnings: {'; '.join(risk.warnings) if risk.warnings else 'None'}

== RESEARCH DEBATE ==
{consensus_section}

== WEIGHTED SIGNALS ==
{signals_text}

== PORTFOLIO ==
{portfolio_text}

== DEBATE QUALITY ==
Quality: {debate_quality:.2f}/1.00
>0.7 = high conviction, 0.4-0.7 = moderate, <0.4 = low quality

== DECISION CRITERIA ==
1. Risk manager VETOED -> almost always reject
2. Debate quality < 0.3 AND confidence < 0.6 -> reject
3. Alignment < 2/4 AND no stat arb signal -> reject
4. Approve if: risk OK, confidence > threshold, coherent thesis

== OUTPUT FORMAT ==
DECISION: APPROVE or REJECT
NOTES: <2-3 sentences>"""


def _parse_decision(text: str, rec: TradeRecommendation, risk: RiskAssessment) -> FinalDecision:
    decision_match = re.search(r"DECISION\s*[:=]\s*(APPROVE|REJECT)", text, re.IGNORECASE)
    approved = decision_match.group(1).strip().upper() == "APPROVE" if decision_match else False
    if not decision_match:
        log.warning("fund_decision_parse_failed", text_preview=text[:300])

    notes_match = re.search(r"NOTES\s*[:=]\s*(.*?)$", text, re.DOTALL | re.IGNORECASE)
    notes = notes_match.group(1).strip() if notes_match else text.strip()

    final_rec = TradeRecommendation(
        recommendation_id=rec.recommendation_id, ticker=rec.ticker, market=rec.market,
        action=rec.action, entry_price=rec.entry_price, take_profit=rec.take_profit,
        stop_loss=rec.stop_loss,
        size_usd=risk.position_size_adjusted if risk.position_size_adjusted is not None else rec.size_usd,
        leverage=risk.leverage_adjusted if risk.leverage_adjusted is not None else rec.leverage,
        confidence=rec.confidence, reasoning=rec.reasoning,
        time_horizon=rec.time_horizon, signal_alignment=rec.signal_alignment,
    )

    # On testnet/dev, allow fund manager to override risk rejection
    # if there's no hard veto (missing stop loss, etc.)
    risk_hard_veto = risk.veto_reason is not None
    if settings.environment != "prod" and approved and not risk.approved and not risk_hard_veto:
        execution_ready = True
        notes += " [Fund manager override: risk soft-rejected but no hard veto, dev mode]"
    else:
        execution_ready = approved and risk.approved

    return FinalDecision(
        approved=approved, recommendation=final_rec, risk_assessment=risk,
        fund_manager_notes=notes, execution_ready=execution_ready,
    )


def run_fund_manager(state: HyperAlphaState) -> dict:
    """Layer 7: Fund manager makes the final approval decision."""
    rec: Optional[TradeRecommendation] = state.get("trade_recommendation")
    risk: Optional[RiskAssessment] = state.get("risk_assessment")
    consensus = state.get("debate_consensus")
    portfolio = state.get("portfolio_state")

    if rec is None:
        return {"final_decision": FinalDecision(approved=False, fund_manager_notes="No trade recommendation.")}
    if risk is None:
        return {"final_decision": FinalDecision(approved=False, recommendation=rec, fund_manager_notes="No risk assessment.")}
    if rec.action == "hold":
        log.info("fund_manager_hold_passthrough")
        return {"final_decision": FinalDecision(approved=True, recommendation=rec, risk_assessment=risk, fund_manager_notes="Hold — no execution needed.", execution_ready=False)}

    # ── Dev/testnet fast-approve: skip LLM gate, use rule-based approval ──
    # Hard safety checks still enforced (stop loss, size limits, leverage)
    if settings.environment != "prod":
        hard_veto = risk.veto_reason is not None
        has_sl = rec.stop_loss is not None
        within_size = (rec.size_usd or 0) <= settings.max_position_size_usd
        within_lev = (rec.leverage or 1) <= settings.max_leverage

        if hard_veto:
            notes = f"Dev mode REJECT: {risk.veto_reason}"
            approved = False
        elif not has_sl:
            notes = "Dev mode REJECT: no stop loss"
            approved = False
        elif not within_size or not within_lev:
            notes = "Dev mode REJECT: exceeds size/leverage limits"
            approved = False
        else:
            notes = (f"Dev mode APPROVE: SL={rec.stop_loss}, size=${rec.size_usd:.0f}, "
                     f"lev={rec.leverage}x, conf={rec.confidence:.0%}, align={rec.signal_alignment}/4")
            approved = True

        final_rec = TradeRecommendation(
            recommendation_id=rec.recommendation_id, ticker=rec.ticker, market=rec.market,
            action=rec.action, entry_price=rec.entry_price, take_profit=rec.take_profit,
            stop_loss=rec.stop_loss,
            size_usd=risk.position_size_adjusted if risk.position_size_adjusted is not None else rec.size_usd,
            leverage=risk.leverage_adjusted if risk.leverage_adjusted is not None else rec.leverage,
            confidence=rec.confidence, reasoning=rec.reasoning,
            time_horizon=rec.time_horizon, signal_alignment=rec.signal_alignment,
        )
        decision = FinalDecision(
            approved=approved, recommendation=final_rec, risk_assessment=risk,
            fund_manager_notes=notes, execution_ready=approved,
        )
        log.info("fund_decision", ticker=rec.ticker, approved=decision.approved,
                 execution_ready=decision.execution_ready, action=rec.action, notes=notes)
        return {"final_decision": decision}

    # ── Production: full LLM-based approval ──
    prompt = _build_prompt(rec, risk, consensus, _format_portfolio(portfolio))

    try:
        response = _get_quick_llm().invoke([HumanMessage(content=prompt)])
        decision = _parse_decision(response.content, rec, risk)
    except Exception as exc:
        log.error("fund_manager_llm_error", error=str(exc))
        return {"final_decision": FinalDecision(approved=False, recommendation=rec, risk_assessment=risk, fund_manager_notes=f"LLM error — rejecting: {exc}")}

    log.info("fund_decision", ticker=rec.ticker, approved=decision.approved, execution_ready=decision.execution_ready, action=rec.action, notes=decision.fund_manager_notes[:200])
    return {"final_decision": decision}
