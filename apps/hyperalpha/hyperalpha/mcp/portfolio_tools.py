"""MCP Portfolio Tools — portfolio state and risk checks for CrewAI agents."""
from __future__ import annotations

import asyncio
import json
from typing import Any

from crewai.tools import BaseTool

from hyperalpha.config import settings
from hyperalpha.data.hyperliquid_connector import HyperliquidConnector


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


class GetPortfolioStateTool(BaseTool):
    name: str = "get_portfolio_state"
    description: str = (
        "Get current portfolio state from Hyperliquid: equity, margin, "
        "unrealized PnL, leverage, and open positions."
    )

    def _run(self) -> str:
        connector = HyperliquidConnector()
        try:
            state = _run_async(connector.get_user_state())
            return json.dumps(state, default=str)
        except Exception as e:
            return json.dumps({"error": str(e), "equity": 0, "positions": []})
        finally:
            _run_async(connector.close())


class CheckRiskLimitsTool(BaseTool):
    name: str = "check_risk_limits"
    description: str = (
        "Check if a proposed trade passes risk limits. "
        "Input: JSON with size_usd, leverage, stop_loss, action. "
        "Returns pass/fail with reasons."
    )

    def _run(self, size_usd: float = 100, leverage: float = 1.0,
             stop_loss: float = 0, action: str = "long") -> str:
        warnings = []
        passed = True

        if stop_loss == 0 or stop_loss is None:
            warnings.append("VETO: No stop loss defined")
            passed = False

        if size_usd > settings.max_position_size_usd:
            warnings.append(
                f"Size ${size_usd:.0f} exceeds max ${settings.max_position_size_usd:.0f}")
            passed = False

        if leverage > settings.max_leverage:
            warnings.append(
                f"Leverage {leverage}x exceeds max {settings.max_leverage}x")
            passed = False

        return json.dumps({
            "passed": passed,
            "warnings": warnings,
            "max_position_size": settings.max_position_size_usd,
            "max_leverage": settings.max_leverage,
            "max_drawdown_pct": settings.max_portfolio_drawdown_pct,
        })


def get_portfolio_tools() -> list[BaseTool]:
    """Return all portfolio tools for CrewAI agents."""
    return [GetPortfolioStateTool(), CheckRiskLimitsTool()]
