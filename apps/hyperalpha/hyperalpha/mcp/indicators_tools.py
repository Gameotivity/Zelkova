"""MCP Indicators Tools — wraps indicator computation for CrewAI agents."""
from __future__ import annotations

import asyncio
import json
from typing import Any

import numpy as np
from crewai.tools import BaseTool

from hyperalpha.data.hyperliquid_connector import HyperliquidConnector
from hyperalpha.indicators.core import compute_all_indicators
from hyperalpha.agents.strategy_signals import compute_strategy_signals
from hyperalpha.agents.stat_arb import _funding_rate_signal, _mean_reversion_signal, _order_book_imbalance_signal


def _run_async(coro: Any) -> Any:
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as pool:
                return pool.submit(asyncio.run, coro).result()
        return loop.run_until_complete(coro)
    except RuntimeError:
        return asyncio.run(coro)


def _safe_serialize(obj: Any) -> Any:
    """Make numpy types JSON serializable."""
    if isinstance(obj, (np.floating, np.integer)):
        return float(obj)
    if isinstance(obj, np.ndarray):
        return obj.tolist()
    if isinstance(obj, dict):
        return {k: _safe_serialize(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_safe_serialize(v) for v in obj]
    return obj


class ComputeIndicatorsTool(BaseTool):
    name: str = "compute_indicators"
    description: str = (
        "Compute all technical indicators (RSI, MACD, Bollinger, EMA, "
        "Ichimoku, Stochastic, Fibonacci, ATR, VWAP, Z-score, Hurst) "
        "from OHLCV candle data for a given ticker."
    )

    def _run(self, ticker: str = "BTC") -> str:
        connector = HyperliquidConnector()
        try:
            snapshot = _run_async(connector.get_market_snapshot(ticker))
            candles_1h = snapshot.get("candles_1h", [])
            candles_4h = snapshot.get("candles_4h", [])

            ind_1h = compute_all_indicators(candles_1h, interval="1h")
            ind_4h = compute_all_indicators(candles_4h, interval="4h")

            result = {
                "indicators_1h": _safe_serialize(ind_1h),
                "indicators_4h": _safe_serialize(ind_4h),
            }
            return json.dumps(result, default=str)
        finally:
            _run_async(connector.close())


class ComputeStrategySignalsTool(BaseTool):
    name: str = "compute_strategy_signals"
    description: str = (
        "Compute composite strategy signals (RSI divergence, golden cross, "
        "Bollinger squeeze, VWAP reclaim, Ichimoku breakout, Fibonacci confluence, "
        "etc.) from pre-computed indicator data."
    )

    def _run(self, ticker: str = "BTC") -> str:
        connector = HyperliquidConnector()
        try:
            snapshot = _run_async(connector.get_market_snapshot(ticker))
            candles_1h = snapshot.get("candles_1h", [])
            candles_4h = snapshot.get("candles_4h", [])
            price = snapshot.get("mid_price", 0)

            ind_1h = compute_all_indicators(candles_1h, interval="1h")
            ind_4h = compute_all_indicators(candles_4h, interval="4h")

            signals = compute_strategy_signals(ind_1h, ind_4h, price)
            result = [{
                "name": s.name, "direction": s.direction,
                "strength": s.strength, "timeframe": s.timeframe,
                "description": s.description,
            } for s in signals]
            return json.dumps(result, default=str)
        finally:
            _run_async(connector.close())


class ComputeStatArbTool(BaseTool):
    name: str = "compute_stat_arb_signals"
    description: str = (
        "Compute statistical arbitrage signals: funding rate arb, "
        "mean reversion, order book imbalance."
    )

    def _run(self, ticker: str = "BTC") -> str:
        connector = HyperliquidConnector()
        try:
            snapshot = _run_async(connector.get_market_snapshot(ticker))
            candles_1h = snapshot.get("candles_1h", [])
            ind_1h = compute_all_indicators(candles_1h, interval="1h")

            signals = []
            for fn in [_funding_rate_signal, _mean_reversion_signal, _order_book_imbalance_signal]:
                sig = fn(snapshot, ind_1h)
                if sig:
                    signals.append({
                        "strategy": sig.strategy_name,
                        "signal": sig.signal.value,
                        "z_score": sig.z_score,
                        "confidence": sig.confidence,
                        "expected_return": sig.expected_return_pct,
                    })
            return json.dumps(signals, default=str)
        finally:
            _run_async(connector.close())


def get_indicator_tools() -> list[BaseTool]:
    """Return all indicator tools for CrewAI agents."""
    return [ComputeIndicatorsTool(), ComputeStrategySignalsTool(), ComputeStatArbTool()]
