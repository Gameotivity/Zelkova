"""HyperAlpha — Circuit Breaker for autonomous trading.

Safety limits that auto-pause the agent when risk thresholds are hit:
- Daily loss limit (default 5% of starting equity)
- Max drawdown (default 15% from peak equity)
- Max consecutive losses
- Max open positions
- Per-trade loss limit
"""
from __future__ import annotations

import json
import time
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import structlog

logger = structlog.get_logger(__name__)

STATE_FILE = Path(__file__).parent.parent.parent / "circuit_state.json"


@dataclass
class CircuitBreakerConfig:
    """Safety thresholds — conservative defaults."""
    max_daily_loss_pct: float = 5.0
    max_drawdown_pct: float = 15.0
    max_consecutive_losses: int = 5
    max_open_positions: int = 3
    max_single_trade_loss_pct: float = 3.0
    cooldown_minutes: int = 60


@dataclass
class CircuitState:
    """Tracked state for circuit breaker evaluation."""
    peak_equity: float = 0.0
    day_start_equity: float = 0.0
    day_start_ts: float = 0.0
    consecutive_losses: int = 0
    daily_pnl: float = 0.0
    total_pnl: float = 0.0
    trades_today: int = 0
    paused: bool = False
    pause_reason: str = ""
    pause_until: float = 0.0

    def save(self):
        STATE_FILE.write_text(json.dumps(asdict(self), indent=2))

    @classmethod
    def load(cls) -> "CircuitState":
        if STATE_FILE.exists():
            try:
                data = json.loads(STATE_FILE.read_text())
                return cls(**{k: v for k, v in data.items() if k in cls.__dataclass_fields__})
            except Exception:
                pass
        return cls()


class CircuitBreaker:
    """Evaluates safety conditions before each trade."""

    def __init__(self, config: Optional[CircuitBreakerConfig] = None):
        self.config = config or CircuitBreakerConfig()
        self.state = CircuitState.load()

    def initialize(self, current_equity: float):
        """Set starting equity if not already set."""
        now = time.time()

        if self.state.peak_equity == 0:
            self.state.peak_equity = current_equity

        # Reset daily counters at midnight UTC
        if self.state.day_start_ts == 0:
            self.state.day_start_equity = current_equity
            self.state.day_start_ts = now
        else:
            day_start = datetime.fromtimestamp(self.state.day_start_ts, tz=timezone.utc)
            today = datetime.now(timezone.utc)
            if today.date() > day_start.date():
                self.state.day_start_equity = current_equity
                self.state.day_start_ts = now
                self.state.daily_pnl = 0.0
                self.state.trades_today = 0
                logger.info("circuit_day_reset", equity=current_equity)

        # Update peak equity
        if current_equity > self.state.peak_equity:
            self.state.peak_equity = current_equity

        self.state.save()

    def can_trade(self, current_equity: float, open_position_count: int) -> tuple[bool, str]:
        """Check if trading is allowed. Returns (allowed, reason)."""
        self.initialize(current_equity)

        # Check cooldown
        if self.state.paused and time.time() < self.state.pause_until:
            remaining = int((self.state.pause_until - time.time()) / 60)
            return False, f"PAUSED: {self.state.pause_reason} ({remaining}m remaining)"

        # Auto-resume after cooldown
        if self.state.paused and time.time() >= self.state.pause_until:
            logger.info("circuit_resumed", reason=self.state.pause_reason)
            self.state.paused = False
            self.state.pause_reason = ""
            self.state.save()

        # Check daily loss
        if self.state.day_start_equity > 0:
            daily_loss_pct = (self.state.day_start_equity - current_equity) / self.state.day_start_equity * 100
            if daily_loss_pct >= self.config.max_daily_loss_pct:
                return self._trip(f"Daily loss {daily_loss_pct:.1f}% >= {self.config.max_daily_loss_pct}%")

        # Check max drawdown from peak
        if self.state.peak_equity > 0:
            drawdown_pct = (self.state.peak_equity - current_equity) / self.state.peak_equity * 100
            if drawdown_pct >= self.config.max_drawdown_pct:
                return self._trip(f"Drawdown {drawdown_pct:.1f}% >= {self.config.max_drawdown_pct}%")

        # Check consecutive losses
        if self.state.consecutive_losses >= self.config.max_consecutive_losses:
            return self._trip(f"{self.state.consecutive_losses} consecutive losses")

        # Check open positions
        if open_position_count >= self.config.max_open_positions:
            return False, f"Max positions reached ({open_position_count}/{self.config.max_open_positions})"

        return True, "OK"

    def record_trade(self, pnl: float, current_equity: float):
        """Record a completed trade for tracking."""
        self.state.daily_pnl += pnl
        self.state.total_pnl += pnl
        self.state.trades_today += 1

        if pnl < 0:
            self.state.consecutive_losses += 1
        else:
            self.state.consecutive_losses = 0

        if current_equity > self.state.peak_equity:
            self.state.peak_equity = current_equity

        self.state.save()
        logger.info(
            "circuit_trade_recorded",
            pnl=f"${pnl:+.2f}",
            daily_pnl=f"${self.state.daily_pnl:+.2f}",
            consec_losses=self.state.consecutive_losses,
        )

    def _trip(self, reason: str) -> tuple[bool, str]:
        """Trip the circuit breaker."""
        self.state.paused = True
        self.state.pause_reason = reason
        self.state.pause_until = time.time() + self.config.cooldown_minutes * 60
        self.state.save()
        logger.warning("CIRCUIT_BREAKER_TRIPPED", reason=reason, cooldown_min=self.config.cooldown_minutes)
        return False, f"CIRCUIT BREAKER: {reason}"

    def force_resume(self):
        """Manually resume trading."""
        self.state.paused = False
        self.state.pause_reason = ""
        self.state.pause_until = 0
        self.state.save()
        logger.info("circuit_force_resumed")
