"""MCP Market Data Tools — wraps HyperliquidConnector for CrewAI agents."""
from __future__ import annotations

import asyncio
import json
from typing import Any

from crewai.tools import BaseTool
from pydantic import Field

from hyperalpha.data.hyperliquid_connector import HyperliquidConnector


def _run_async(coro: Any) -> Any:
    """Run async in sync context (CrewAI tools are sync)."""
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as pool:
                return pool.submit(asyncio.run, coro).result()
        return loop.run_until_complete(coro)
    except RuntimeError:
        return asyncio.run(coro)


class GetMarketSnapshotTool(BaseTool):
    name: str = "get_market_snapshot"
    description: str = (
        "Fetch a complete market snapshot for a ticker from Hyperliquid. "
        "Returns mid_price, mark_price, funding_rate, open_interest, "
        "24h_volume, bid_ask_spread, order_book_imbalance, and OHLCV candles."
    )
    ticker: str = Field(default="BTC", description="Ticker symbol")

    def _run(self, ticker: str = "BTC") -> str:
        connector = HyperliquidConnector()
        try:
            snapshot = _run_async(connector.get_market_snapshot(ticker))
            # Remove raw candle arrays to keep output manageable
            summary = {k: v for k, v in snapshot.items()
                       if k not in ("candles_1h", "candles_4h")}
            summary["candles_1h_count"] = len(snapshot.get("candles_1h", []))
            summary["candles_4h_count"] = len(snapshot.get("candles_4h", []))
            return json.dumps(summary, default=str)
        finally:
            _run_async(connector.close())


class GetCandlesTool(BaseTool):
    name: str = "get_candles"
    description: str = (
        "Fetch OHLCV candle data for a ticker. Returns arrays of "
        "[timestamp, open, high, low, close, volume] for 1h and 4h intervals."
    )

    def _run(self, ticker: str = "BTC") -> str:
        connector = HyperliquidConnector()
        try:
            snapshot = _run_async(connector.get_market_snapshot(ticker))
            candles = {
                "candles_1h": snapshot.get("candles_1h", [])[-20:],
                "candles_4h": snapshot.get("candles_4h", [])[-20:],
            }
            return json.dumps(candles, default=str)
        finally:
            _run_async(connector.close())


class GetAllMidsTool(BaseTool):
    name: str = "get_all_mids"
    description: str = "Fetch current mid prices for all assets on Hyperliquid."

    def _run(self) -> str:
        connector = HyperliquidConnector()
        try:
            mids = _run_async(connector.get_all_mids())
            return json.dumps(mids, default=str)
        finally:
            _run_async(connector.close())


def get_market_data_tools() -> list[BaseTool]:
    """Return all market data tools for CrewAI agents."""
    return [GetMarketSnapshotTool(), GetCandlesTool(), GetAllMidsTool()]
