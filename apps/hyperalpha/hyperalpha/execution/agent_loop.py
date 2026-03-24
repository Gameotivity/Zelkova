"""HyperAlpha — Autonomous Trading Agent.

Runs the full AI pipeline on a loop, auto-executes approved trades
on Hyperliquid (testnet or mainnet), manages positions, and
enforces circuit breaker safety limits.

Usage:
  python -m hyperalpha.main --ticker BTC,ETH --mode agent --interval 300
"""
from __future__ import annotations

import asyncio
import json
import signal
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import structlog

from hyperalpha.config import settings
from hyperalpha.graph import HyperAlphaEngine, format_decision_report
from hyperalpha.types import FinalDecision, TradeRecommendation
from hyperalpha.execution.executor import HyperliquidExecutor, PositionInfo
from hyperalpha.execution.circuit_breaker import CircuitBreaker, CircuitBreakerConfig

logger = structlog.get_logger(__name__)

TRADE_LOG = Path(__file__).parent.parent.parent / "agent_trades.json"

_shutdown = asyncio.Event()


def _handle_signal(*_):
    _shutdown.set()


def _load_trade_log() -> list[dict]:
    if TRADE_LOG.exists():
        try:
            return json.loads(TRADE_LOG.read_text())
        except Exception:
            pass
    return []


def _save_trade_log(trades: list[dict]):
    TRADE_LOG.write_text(json.dumps(trades, indent=2))


def _sz_decimals(ticker: str) -> int:
    """Get size decimal precision for common assets."""
    big_assets = {"BTC": 5, "ETH": 4, "SOL": 2, "BNB": 3}
    return big_assets.get(ticker, 1)


def _round_size(size: float, ticker: str) -> float:
    """Round order size to valid precision for the asset."""
    decimals = _sz_decimals(ticker)
    return round(size, decimals)


class AutonomousAgent:
    """The full autonomous trading loop."""

    def __init__(
        self,
        tickers: list[str],
        interval_seconds: int = 300,
        use_testnet: bool = True,
    ):
        self.tickers = tickers
        self.interval = interval_seconds
        self.use_testnet = use_testnet

        # Core components
        self.engine = HyperAlphaEngine()
        self.executor = HyperliquidExecutor(use_testnet=use_testnet)
        self.circuit = CircuitBreaker(CircuitBreakerConfig(
            max_daily_loss_pct=5.0,
            max_drawdown_pct=15.0,
            max_consecutive_losses=5,
            max_open_positions=3,
            cooldown_minutes=30 if use_testnet else 60,
        ))

        self.trade_log = _load_trade_log()

    async def run(self):
        """Main agent loop."""
        loop = asyncio.get_running_loop()
        for sig in (signal.SIGTERM, signal.SIGINT):
            loop.add_signal_handler(sig, _handle_signal)

        net = "TESTNET" if self.use_testnet else "MAINNET"
        equity = self.executor.get_account_value()
        available = self.executor.get_available_balance()

        print(f"\n{'=' * 60}")
        print(f"  HYPERALPHA AUTONOMOUS AGENT — {net}")
        print(f"{'=' * 60}")
        print(f"  Tickers:    {', '.join(self.tickers)}")
        print(f"  Interval:   {self.interval}s")
        print(f"  Equity:     ${equity:,.2f}")
        print(f"  Available:  ${available:,.2f}")
        print(f"  Max Lev:    {settings.max_leverage}x")
        print(f"  Address:    {self.executor._address[:10]}...")
        print(f"{'=' * 60}\n")

        if equity == 0:
            print("  ERROR: Account has zero equity. Fund your testnet account first.")
            print("  Visit: https://app.hyperliquid-testnet.xyz")
            return

        self.circuit.initialize(equity)
        cycle = 0

        try:
            while not _shutdown.is_set():
                cycle += 1
                await self._run_cycle(cycle)

                if not _shutdown.is_set():
                    print(f"\n  Next cycle in {self.interval}s... (Ctrl+C to stop)\n")
                    try:
                        await asyncio.wait_for(_shutdown.wait(), timeout=self.interval)
                    except asyncio.TimeoutError:
                        pass
        finally:
            _save_trade_log(self.trade_log)
            await self.engine.close()
            print("\n  Agent stopped. Trades saved to agent_trades.json")

    async def _run_cycle(self, cycle: int):
        """Single analysis + execution cycle."""
        ts = datetime.now(timezone.utc).strftime("%H:%M:%S UTC")
        print(f"\n{'#' * 60}")
        print(f"  CYCLE {cycle} — {ts}")
        print(f"{'#' * 60}")

        # Get current account state
        equity = self.executor.get_account_value()
        positions = self.executor.get_positions()

        # Circuit breaker check
        can_trade, reason = self.circuit.can_trade(equity, len(positions))
        if not can_trade:
            print(f"\n  {reason}")
            self._print_status(equity, positions)
            return

        # Check existing positions for exit conditions
        await self._manage_positions(positions)

        # Run AI pipeline for each ticker
        for ticker in self.tickers:
            if _shutdown.is_set():
                break

            # Skip if already in position
            existing = self.executor.get_position(ticker)
            if existing:
                print(f"\n  {ticker}: In {existing.side} @ ${existing.entry_price:,.2f} "
                      f"(PnL: ${existing.unrealized_pnl:+,.2f})")
                continue

            # Re-check circuit breaker (equity may have changed)
            positions = self.executor.get_positions()
            can_trade, reason = self.circuit.can_trade(equity, len(positions))
            if not can_trade:
                print(f"\n  {reason}")
                break

            print(f"\n  Analyzing {ticker}...")
            try:
                state = await asyncio.wait_for(
                    self.engine.analyze(ticker),
                    timeout=settings.pipeline_timeout_seconds,
                )
            except Exception as e:
                logger.error("analysis_failed", ticker=ticker, error=str(e))
                continue

            decision: Optional[FinalDecision] = state.get("final_decision")
            if not decision:
                print(f"  {ticker}: No decision")
                continue

            rec = decision.recommendation
            run_id = state.get("run_id", "")

            # Print signals summary
            strategy_sigs = state.get("strategy_signals", [])
            if strategy_sigs:
                bullish = sum(1 for s in strategy_sigs if s.direction == "bullish")
                bearish = sum(1 for s in strategy_sigs if s.direction == "bearish")
                print(f"  Signals: {bullish} bullish / {bearish} bearish")

            if not decision.approved or not rec or rec.action == "hold":
                notes = decision.fund_manager_notes[:80] if decision else "N/A"
                print(f"  {ticker}: PASS — {notes}")
                continue

            if not decision.execution_ready:
                print(f"  {ticker}: Approved but risk-rejected")
                continue

            # EXECUTE THE TRADE
            await self._execute_trade(ticker, rec, equity, run_id)

        self._print_status(equity, positions)

    async def _execute_trade(
        self, ticker: str, rec: TradeRecommendation,
        equity: float, run_id: str,
    ):
        """Execute an approved trade on Hyperliquid."""
        is_buy = rec.action == "long"
        entry_price = rec.entry_price or 0
        if entry_price == 0:
            logger.error("no_entry_price", ticker=ticker)
            return

        # Calculate size in asset units
        size_usd = min(rec.size_usd or 100, equity * 0.3)
        size_units = size_usd / entry_price
        size_units = _round_size(size_units, ticker)

        if size_units <= 0:
            logger.error("zero_size", ticker=ticker, size_usd=size_usd)
            return

        leverage = max(1, int(rec.leverage or 1))

        print(f"\n  >>> EXECUTING: {'LONG' if is_buy else 'SHORT'} {ticker}")
        print(f"      Size: {size_units} ({size_usd:.0f} USD) @ ~${entry_price:,.2f}")
        print(f"      Leverage: {leverage}x | SL: ${rec.stop_loss:,.2f}" +
              (f" | TP: ${rec.take_profit:,.2f}" if rec.take_profit else ""))

        # Set leverage
        self.executor.set_leverage(ticker, leverage)

        # Place market order
        result = self.executor.market_open(
            ticker, is_buy, size_units, slippage=0.03,
        )

        if not result.success:
            print(f"      FAILED: {result.error}")
            return

        fill_price = result.avg_price or entry_price
        print(f"      FILLED: oid={result.order_id} @ ${fill_price:,.2f}")

        # Place stop loss
        if rec.stop_loss:
            sl_side = not is_buy  # SL is opposite direction
            sl_result = self.executor.place_tp_sl(
                ticker, sl_side, size_units,
                rec.stop_loss, order_type="sl",
            )
            if sl_result.success:
                print(f"      SL set @ ${rec.stop_loss:,.2f}")
            else:
                print(f"      SL FAILED: {sl_result.error}")

        # Place take profit
        if rec.take_profit:
            tp_side = not is_buy
            tp_result = self.executor.place_tp_sl(
                ticker, tp_side, size_units,
                rec.take_profit, order_type="tp",
            )
            if tp_result.success:
                print(f"      TP set @ ${rec.take_profit:,.2f}")
            else:
                print(f"      TP FAILED: {tp_result.error}")

        # Log trade
        trade = {
            "ticker": ticker,
            "side": "long" if is_buy else "short",
            "entry_price": fill_price,
            "size_units": size_units,
            "size_usd": size_usd,
            "leverage": leverage,
            "stop_loss": rec.stop_loss,
            "take_profit": rec.take_profit,
            "confidence": rec.confidence,
            "order_id": result.order_id,
            "run_id": run_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "network": "testnet" if self.use_testnet else "mainnet",
        }
        self.trade_log.append(trade)
        _save_trade_log(self.trade_log)

    async def _manage_positions(self, positions: list[PositionInfo]):
        """Check if any positions need manual intervention.

        Note: TP/SL trigger orders on HL handle most exits automatically.
        This is for additional safety checks.
        """
        for pos in positions:
            # Emergency close: if position PnL exceeds max single trade loss
            if pos.unrealized_pnl < 0:
                loss_pct = abs(pos.unrealized_pnl) / (pos.size * pos.entry_price) * 100
                if loss_pct >= self.circuit.config.max_single_trade_loss_pct * 2:
                    print(f"\n  EMERGENCY CLOSE: {pos.ticker} loss {loss_pct:.1f}%")
                    result = self.executor.market_close(pos.ticker)
                    if result.success:
                        self.circuit.record_trade(
                            pos.unrealized_pnl,
                            self.executor.get_account_value(),
                        )

    def _print_status(self, equity: float, positions: list[PositionInfo]):
        """Print current account status."""
        available = self.executor.get_available_balance()
        cb = self.circuit.state

        print(f"\n{'─' * 60}")
        print(f"  ACCOUNT STATUS")
        print(f"  Equity: ${equity:,.2f} | Available: ${available:,.2f}")
        print(f"  Peak: ${cb.peak_equity:,.2f} | Daily PnL: ${cb.daily_pnl:+,.2f}")
        print(f"  Trades today: {cb.trades_today} | Consec losses: {cb.consecutive_losses}")

        if positions:
            print(f"\n  POSITIONS:")
            for p in positions:
                print(f"    {p.side.upper()} {p.ticker}: {p.size} @ ${p.entry_price:,.2f} "
                      f"| PnL: ${p.unrealized_pnl:+,.2f} | Lev: {p.leverage}x")
        else:
            print(f"  No open positions.")

        if self.trade_log:
            recent = self.trade_log[-3:]
            print(f"\n  RECENT EXECUTIONS:")
            for t in recent:
                print(f"    {t['side'].upper()} {t['ticker']} @ ${t['entry_price']:,.2f} "
                      f"| {t['size_usd']:.0f} USD | conf={t['confidence']:.0f}%")
        print(f"{'─' * 60}")
