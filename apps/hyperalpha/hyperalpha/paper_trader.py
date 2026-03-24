"""HyperAlpha Paper Trading Engine — virtual execution with live prices.

Runs the AI pipeline on an interval, auto-executes approved trades,
tracks positions and PnL using live Hyperliquid mid prices.
"""
from __future__ import annotations

import asyncio
import json
import signal
import time
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import structlog

from hyperalpha.config import settings
from hyperalpha.data.hyperliquid_connector import HyperliquidConnector
from hyperalpha.graph import HyperAlphaEngine, format_decision_report
from hyperalpha.types import FinalDecision, TradeRecommendation

logger = structlog.get_logger(__name__)

TRADES_FILE = Path(__file__).parent.parent / "paper_trades.json"


@dataclass
class PaperPosition:
    ticker: str
    side: str  # "long" or "short"
    entry_price: float
    size_usd: float
    leverage: float
    stop_loss: Optional[float] = None
    take_profit: Optional[float] = None
    opened_at: str = ""
    run_id: str = ""

    @property
    def size_units(self) -> float:
        return self.size_usd / self.entry_price if self.entry_price > 0 else 0

    def unrealized_pnl(self, current_price: float) -> float:
        diff = current_price - self.entry_price
        if self.side == "short":
            diff = -diff
        return diff * self.size_units * self.leverage

    def unrealized_pnl_pct(self, current_price: float) -> float:
        pnl = self.unrealized_pnl(current_price)
        return (pnl / self.size_usd * 100) if self.size_usd > 0 else 0

    def should_stop_out(self, current_price: float) -> bool:
        if self.stop_loss is None:
            return False
        if self.side == "long":
            return current_price <= self.stop_loss
        return current_price >= self.stop_loss

    def should_take_profit(self, current_price: float) -> bool:
        if self.take_profit is None:
            return False
        if self.side == "long":
            return current_price >= self.take_profit
        return current_price <= self.take_profit


@dataclass
class PaperAccount:
    starting_balance: float = 1000.0
    balance: float = 1000.0
    positions: list[PaperPosition] = field(default_factory=list)
    trade_history: list[dict] = field(default_factory=list)
    total_trades: int = 0
    winning_trades: int = 0
    total_pnl: float = 0.0

    def get_position(self, ticker: str) -> Optional[PaperPosition]:
        for p in self.positions:
            if p.ticker == ticker:
                return p
        return None

    def open_position(self, rec: TradeRecommendation, run_id: str) -> str:
        if self.get_position(rec.ticker):
            return f"Already have open position in {rec.ticker}"

        size = min(rec.size_usd or 100, self.balance * 0.5)
        if size > self.balance:
            return f"Insufficient balance: ${self.balance:.2f} < ${size:.2f}"

        pos = PaperPosition(
            ticker=rec.ticker,
            side="long" if rec.action == "long" else "short",
            entry_price=rec.entry_price or 0,
            size_usd=size,
            leverage=rec.leverage or 1.0,
            stop_loss=rec.stop_loss,
            take_profit=rec.take_profit,
            opened_at=datetime.now(timezone.utc).isoformat(),
            run_id=run_id,
        )
        self.positions.append(pos)
        self.balance -= size  # margin locked
        logger.info(
            "paper_open", ticker=rec.ticker, side=pos.side,
            entry=pos.entry_price, size=size, sl=pos.stop_loss, tp=pos.take_profit,
        )
        return f"Opened {pos.side} {rec.ticker} @ ${pos.entry_price:,.2f}, size=${size:.0f}"

    def close_position(self, ticker: str, exit_price: float, reason: str) -> str:
        pos = self.get_position(ticker)
        if pos is None:
            return f"No open position in {ticker}"

        pnl = pos.unrealized_pnl(exit_price)
        pnl_pct = pos.unrealized_pnl_pct(exit_price)
        self.balance += pos.size_usd + pnl  # return margin + PnL
        self.total_pnl += pnl
        self.total_trades += 1
        if pnl > 0:
            self.winning_trades += 1

        trade_record = {
            "ticker": ticker, "side": pos.side,
            "entry": pos.entry_price, "exit": exit_price,
            "size_usd": pos.size_usd, "pnl": round(pnl, 2),
            "pnl_pct": round(pnl_pct, 2), "reason": reason,
            "opened_at": pos.opened_at,
            "closed_at": datetime.now(timezone.utc).isoformat(),
            "run_id": pos.run_id,
        }
        self.trade_history.append(trade_record)
        self.positions.remove(pos)

        icon = "+" if pnl >= 0 else ""
        logger.info(
            "paper_close", ticker=ticker, side=pos.side,
            entry=pos.entry_price, exit=exit_price,
            pnl=f"{icon}${pnl:.2f}", pnl_pct=f"{icon}{pnl_pct:.1f}%",
            reason=reason,
        )
        return f"Closed {pos.side} {ticker} @ ${exit_price:,.2f} | PnL: {icon}${pnl:.2f} ({icon}{pnl_pct:.1f}%) | {reason}"

    def portfolio_value(self, prices: dict[str, float]) -> float:
        total = self.balance
        for pos in self.positions:
            price = prices.get(pos.ticker, pos.entry_price)
            total += pos.size_usd + pos.unrealized_pnl(price)
        return total

    def save(self):
        data = {
            "balance": self.balance,
            "starting_balance": self.starting_balance,
            "total_trades": self.total_trades,
            "winning_trades": self.winning_trades,
            "total_pnl": round(self.total_pnl, 2),
            "positions": [asdict(p) for p in self.positions],
            "trade_history": self.trade_history,
        }
        TRADES_FILE.write_text(json.dumps(data, indent=2))

    @classmethod
    def load(cls) -> "PaperAccount":
        if not TRADES_FILE.exists():
            return cls()
        try:
            data = json.loads(TRADES_FILE.read_text())
            acct = cls(
                starting_balance=data.get("starting_balance", 1000),
                balance=data.get("balance", 1000),
                total_trades=data.get("total_trades", 0),
                winning_trades=data.get("winning_trades", 0),
                total_pnl=data.get("total_pnl", 0),
            )
            for p in data.get("positions", []):
                acct.positions.append(PaperPosition(**p))
            acct.trade_history = data.get("trade_history", [])
            return acct
        except Exception:
            return cls()


def _print_account_status(acct: PaperAccount, prices: dict[str, float]):
    pv = acct.portfolio_value(prices)
    ret = (pv - acct.starting_balance) / acct.starting_balance * 100
    wr = (acct.winning_trades / acct.total_trades * 100) if acct.total_trades > 0 else 0

    print(f"\n{'=' * 55}")
    print(f"  PAPER TRADING ACCOUNT")
    print(f"{'=' * 55}")
    print(f"  Portfolio Value:  ${pv:,.2f} ({'+' if ret >= 0 else ''}{ret:.1f}%)")
    print(f"  Cash Balance:     ${acct.balance:,.2f}")
    print(f"  Total PnL:        ${acct.total_pnl:+,.2f}")
    print(f"  Trades: {acct.total_trades} | Win Rate: {wr:.0f}%")

    if acct.positions:
        print(f"\n  OPEN POSITIONS:")
        for pos in acct.positions:
            price = prices.get(pos.ticker, pos.entry_price)
            pnl = pos.unrealized_pnl(price)
            pnl_pct = pos.unrealized_pnl_pct(price)
            print(f"    {pos.side.upper()} {pos.ticker}: entry=${pos.entry_price:,.2f} "
                  f"now=${price:,.2f} | PnL: ${pnl:+,.2f} ({pnl_pct:+.1f}%) "
                  f"| SL=${pos.stop_loss:,.2f}" + (f" TP=${pos.take_profit:,.2f}" if pos.take_profit else ""))
    else:
        print(f"\n  No open positions.")

    if acct.trade_history:
        print(f"\n  RECENT TRADES:")
        for t in acct.trade_history[-5:]:
            icon = "+" if t["pnl"] >= 0 else ""
            print(f"    {t['side'].upper()} {t['ticker']}: "
                  f"${t['entry']:,.2f} -> ${t['exit']:,.2f} | "
                  f"{icon}${t['pnl']:.2f} ({icon}{t['pnl_pct']:.1f}%) | {t['reason']}")
    print(f"{'=' * 55}\n")


_shutdown = asyncio.Event()


def _handle_signal(*_):
    _shutdown.set()


async def run_paper_trading(
    tickers: list[str],
    interval_seconds: int = 300,
):
    """Main paper trading loop."""
    engine = HyperAlphaEngine()
    connector = HyperliquidConnector()
    acct = PaperAccount.load()

    loop = asyncio.get_running_loop()
    for sig in (signal.SIGTERM, signal.SIGINT):
        loop.add_signal_handler(sig, _handle_signal)

    print(f"\n  HYPERALPHA PAPER TRADER")
    print(f"  Tickers: {', '.join(tickers)}")
    print(f"  Interval: {interval_seconds}s")
    print(f"  Starting balance: ${acct.starting_balance:,.2f}")
    print(f"  Max leverage: {settings.max_leverage}x")
    print(f"  Max position: ${settings.max_position_size_usd:,.0f}\n")

    cycle = 0
    try:
        while not _shutdown.is_set():
            cycle += 1
            print(f"\n{'#' * 55}")
            print(f"  CYCLE {cycle} — {datetime.now(timezone.utc).strftime('%H:%M:%S UTC')}")
            print(f"{'#' * 55}")

            # Get live prices for all tickers
            try:
                all_mids = await connector.get_all_mids()
            except Exception as e:
                logger.error("price_fetch_failed", error=str(e))
                await asyncio.sleep(30)
                continue

            # Check stop loss / take profit on open positions
            for pos in list(acct.positions):
                price = all_mids.get(pos.ticker, 0)
                if price == 0:
                    continue
                if pos.should_stop_out(price):
                    msg = acct.close_position(pos.ticker, price, "STOP LOSS HIT")
                    print(f"  {msg}")
                elif pos.should_take_profit(price):
                    msg = acct.close_position(pos.ticker, price, "TAKE PROFIT HIT")
                    print(f"  {msg}")

            # Run AI pipeline for each ticker
            for ticker in tickers:
                if _shutdown.is_set():
                    break

                price = all_mids.get(ticker, 0)
                if price == 0:
                    continue

                existing = acct.get_position(ticker)
                if existing:
                    pnl = existing.unrealized_pnl(price)
                    print(f"\n  {ticker}: Already in {existing.side} @ ${existing.entry_price:,.2f} "
                          f"(PnL: ${pnl:+,.2f})")
                    continue

                print(f"\n  Analyzing {ticker} (${price:,.2f})...")

                try:
                    state = await asyncio.wait_for(
                        engine.analyze(ticker),
                        timeout=settings.pipeline_timeout_seconds,
                    )
                except Exception as e:
                    logger.error("analysis_failed", ticker=ticker, error=str(e))
                    continue

                decision: Optional[FinalDecision] = state.get("final_decision")
                if not decision:
                    print(f"  {ticker}: No decision generated")
                    continue

                rec = decision.recommendation
                run_id = state.get("run_id", "")

                # Print key signals
                strategy_sigs = state.get("strategy_signals", [])
                if strategy_sigs:
                    bullish = sum(1 for s in strategy_sigs if s.direction == "bullish")
                    bearish = sum(1 for s in strategy_sigs if s.direction == "bearish")
                    print(f"  Strategy signals: {bullish} bullish, {bearish} bearish")

                if not decision.approved or not rec or rec.action == "hold":
                    reason = decision.fund_manager_notes[:100] if decision else "No approval"
                    print(f"  {ticker}: PASS — {reason}")
                    continue

                if not decision.execution_ready:
                    print(f"  {ticker}: Approved but not execution-ready (risk rejected)")
                    continue

                # Execute the trade
                print(f"\n  EXECUTING: {rec.action.upper()} {ticker}")
                msg = acct.open_position(rec, run_id)
                print(f"  {msg}")

            # Show account status
            _print_account_status(acct, all_mids)
            acct.save()

            # Wait for next cycle
            if not _shutdown.is_set():
                print(f"  Next analysis in {interval_seconds}s... (Ctrl+C to stop)\n")
                try:
                    await asyncio.wait_for(_shutdown.wait(), timeout=interval_seconds)
                except asyncio.TimeoutError:
                    pass

    finally:
        acct.save()
        await connector.close()
        await engine.close()
        print("\n  Paper trader stopped. Trades saved to paper_trades.json")
