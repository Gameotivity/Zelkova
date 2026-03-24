"""
HyperAlpha — Shared types and LangGraph state schema.

Each agent reads from and writes to specific fields in this state.
All types use timezone-aware datetimes and proper validation.
"""
from __future__ import annotations
from typing import TypedDict, Literal, Optional
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
import uuid


class Signal(Enum):
    STRONG_BUY = "strong_buy"
    BUY = "buy"
    NEUTRAL = "neutral"
    SELL = "sell"
    STRONG_SELL = "strong_sell"


class Market(Enum):
    PERP = "perp"
    SPOT = "spot"


@dataclass
class AnalystReport:
    """Output from any analyst agent."""
    agent_name: str
    ticker: str
    signal: Signal
    confidence: float  # 0.0 - 1.0
    reasoning: str
    key_metrics: dict = field(default_factory=dict)
    data_quality: float = 1.0  # 0.0 (no data) - 1.0 (full data)
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


@dataclass
class DebatePosition:
    """A single argument in the Bull vs Bear debate."""
    side: Literal["bull", "bear"]
    argument: str
    supporting_data: list[str] = field(default_factory=list)
    conviction: float = 0.5  # 0.0 - 1.0
    round_number: int = 1


@dataclass
class DebateConsensus:
    """Structured consensus from the research debate."""
    signal: Signal
    confidence: float
    key_thesis: str
    bull_final_conviction: float
    bear_final_conviction: float
    decisive_factor: str
    debate_quality: float  # 0.0 (inconclusive) - 1.0 (decisive)
    raw_text: str = ""


@dataclass
class StatArbSignal:
    """Output from the statistical arbitrage engine."""
    strategy_name: str
    pair: str
    signal: Signal
    z_score: float
    expected_return_pct: float
    holding_period_hours: int
    confidence: float
    metadata: dict = field(default_factory=dict)


@dataclass
class StrategySignal:
    """A composite strategy signal from the indicator engine."""
    name: str           # e.g. "golden_cross", "rsi_divergence"
    direction: str      # "bullish" | "bearish"
    strength: float     # 0.0-1.0
    timeframe: str      # "1h" | "4h"
    description: str
    supporting_indicators: dict = field(default_factory=dict)


@dataclass
class TradeRecommendation:
    """The trader agent's synthesized recommendation."""
    recommendation_id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])
    ticker: str = ""
    market: Market = Market.PERP
    action: Literal["long", "short", "hold", "close"] = "hold"
    entry_price: Optional[float] = None
    take_profit: Optional[float] = None
    stop_loss: Optional[float] = None
    size_usd: Optional[float] = None
    leverage: Optional[float] = None
    confidence: float = 0.0
    reasoning: str = ""
    time_horizon: str = ""
    signal_alignment: int = 0  # How many of 4 analysts agree (0-4)


@dataclass
class PortfolioState:
    """Current portfolio state for risk assessment."""
    total_equity: float = 0.0
    total_margin_used: float = 0.0
    unrealized_pnl: float = 0.0
    current_leverage: float = 0.0
    open_positions: list[dict] = field(default_factory=list)
    position_count: int = 0


@dataclass
class RiskAssessment:
    """Risk management team's evaluation."""
    approved: bool = False
    risk_score: float = 0.5  # 0.0 (safe) - 1.0 (maximum risk)
    position_size_adjusted: Optional[float] = None
    leverage_adjusted: Optional[float] = None
    warnings: list[str] = field(default_factory=list)
    veto_reason: Optional[str] = None
    max_drawdown_pct: float = 0.0
    portfolio_correlation: float = 0.0


@dataclass
class FinalDecision:
    """Fund manager's final approved/rejected decision."""
    approved: bool = False
    recommendation: Optional[TradeRecommendation] = None
    risk_assessment: Optional[RiskAssessment] = None
    fund_manager_notes: str = ""
    execution_ready: bool = False
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


# ─────────────────────────────────────────────
# LangGraph State — flows through the pipeline
# ─────────────────────────────────────────────

class HyperAlphaState(TypedDict):
    """The shared state object that flows through all LangGraph nodes."""
    # Input
    ticker: str
    market_data: dict

    # Layer 2: Analyst Reports
    fundamentals_report: Optional[AnalystReport]
    sentiment_report: Optional[AnalystReport]
    technicals_report: Optional[AnalystReport]
    macro_report: Optional[AnalystReport]

    # Layer 3: Research Debate
    debate_history: list[DebatePosition]
    debate_consensus: Optional[DebateConsensus]

    # Layer 4: Stat Arb Signals
    stat_arb_signals: list[StatArbSignal]
    strategy_signals: list[StrategySignal]

    # Layer 5: Trader Recommendation
    trade_recommendation: Optional[TradeRecommendation]

    # Layer 6: Risk Assessment
    risk_assessment: Optional[RiskAssessment]
    portfolio_state: Optional[PortfolioState]

    # Layer 7: Final Decision
    final_decision: Optional[FinalDecision]

    # Metadata
    run_id: str
    timestamp: str
    errors: list[str]
    layer_latencies: dict  # e.g. {"analysts": 2.3, "debate": 5.1, ...}


# ─────────────────────────────────────────────
# CrewAI v2 — Hub-and-Spoke Agent Types
# ─────────────────────────────────────────────

class AgentStatus(Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETE = "complete"
    FAILED = "failed"


@dataclass
class SubAgentResult:
    """Standardized output from each of the 8 sub-agents."""
    agent_name: str
    signal: Signal
    confidence: float  # 0.0 - 1.0
    reasoning: str
    key_data: dict = field(default_factory=dict)
    status: AgentStatus = AgentStatus.COMPLETE
    duration_seconds: float = 0.0
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def to_summary(self) -> str:
        return (f"[{self.agent_name}] {self.signal.value} "
                f"(conf={self.confidence:.0%}): {self.reasoning[:150]}")


@dataclass
class SuperAgentDecision:
    """The Super Agent's final synthesized decision."""
    approved: bool = False
    action: Literal["long", "short", "hold", "close"] = "hold"
    ticker: str = ""
    entry_price: Optional[float] = None
    stop_loss: Optional[float] = None
    take_profit: Optional[float] = None
    size_usd: Optional[float] = None
    leverage: Optional[float] = None
    confidence: float = 0.0
    reasoning: str = ""
    execution_ready: bool = False
    risk_score: float = 0.5
    agent_results: list[SubAgentResult] = field(default_factory=list)
    signal_alignment: int = 0  # how many agents agree
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


@dataclass
class AgentStatusUpdate:
    """Real-time status update for frontend streaming."""
    agent_name: str
    status: AgentStatus
    progress_pct: float = 0.0  # 0-100
    message: str = ""
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


@dataclass
class OrchestratorState:
    """Full state of a CrewAI orchestration run."""
    run_id: str = ""
    ticker: str = ""
    market_data: dict = field(default_factory=dict)
    sub_agent_results: list[SubAgentResult] = field(default_factory=list)
    super_decision: Optional[SuperAgentDecision] = None
    status_updates: list[AgentStatusUpdate] = field(default_factory=list)
    total_duration_seconds: float = 0.0
    errors: list[str] = field(default_factory=list)
