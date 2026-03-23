"""
HyperAlpha — Main Entry Point (Production-grade)

Run modes:
  1. CLI:    python -m hyperalpha.main --ticker BTC --mode recommend
  2. API:    python -m hyperalpha.main --mode server
  3. Loop:   python -m hyperalpha.main --ticker BTC,ETH,SOL --mode loop --interval 3600
"""
import asyncio
import signal
import argparse
from datetime import datetime, timezone
from collections import defaultdict

from hyperalpha.graph import HyperAlphaEngine, format_decision_report
from hyperalpha.config import settings

import structlog
structlog.configure(
    processors=[
        structlog.dev.ConsoleRenderer(colors=True)
    ]
)
logger = structlog.get_logger()

# Graceful shutdown flag
_shutdown = asyncio.Event()


def _handle_signal(*_):
    _shutdown.set()


async def run_single_analysis(ticker: str):
    """Run the full pipeline once for a single ticker."""
    engine = HyperAlphaEngine()
    try:
        print(f"\n HyperAlpha analyzing {ticker}...\n")
        print(f"  > Fetching Hyperliquid market data...")
        print(f"  > Running 4 analyst agents (fundamentals, sentiment, technicals, macro)...")
        print(f"  > Bull vs Bear research debate ({settings.max_debate_rounds} rounds)...")
        print(f"  > Statistical arbitrage engine...")
        print(f"  > Trader synthesis...")
        print(f"  > Risk management review...")
        print(f"  > Fund manager final decision...\n")

        state = await asyncio.wait_for(
            engine.analyze(ticker),
            timeout=settings.pipeline_timeout_seconds,
        )
        report = format_decision_report(state)
        print(report)
        return state
    except asyncio.TimeoutError:
        print(f"\n Pipeline timed out after {settings.pipeline_timeout_seconds}s")
        return None
    finally:
        await engine.close()


async def run_multi_ticker_loop(tickers: list[str], interval_seconds: int):
    """Continuously analyze multiple tickers with circuit breaker."""
    engine = HyperAlphaEngine()
    failure_count: dict[str, int] = defaultdict(int)
    max_failures = 5

    # Setup signal handlers for graceful shutdown
    loop = asyncio.get_running_loop()
    for sig in (signal.SIGTERM, signal.SIGINT):
        loop.add_signal_handler(sig, _handle_signal)

    try:
        while not _shutdown.is_set():
            for ticker in tickers:
                if _shutdown.is_set():
                    break

                # Circuit breaker
                if failure_count[ticker] >= max_failures:
                    logger.warning("circuit_breaker_open", ticker=ticker, failures=failure_count[ticker])
                    continue

                try:
                    print(f"\n{'=' * 60}")
                    print(f"  HyperAlpha — {ticker} at {datetime.now(timezone.utc).isoformat()}")
                    print(f"{'=' * 60}")

                    state = await asyncio.wait_for(
                        engine.analyze(ticker),
                        timeout=settings.pipeline_timeout_seconds,
                    )
                    report = format_decision_report(state)
                    print(report)

                    # Reset failure count on success
                    failure_count[ticker] = 0

                except asyncio.TimeoutError:
                    failure_count[ticker] += 1
                    logger.error("ticker_timeout", ticker=ticker, failures=failure_count[ticker])
                except Exception as e:
                    failure_count[ticker] += 1
                    logger.error("ticker_failed", ticker=ticker, error=str(e), failures=failure_count[ticker])

            if not _shutdown.is_set():
                print(f"\n Sleeping {interval_seconds}s until next cycle...\n")
                try:
                    await asyncio.wait_for(_shutdown.wait(), timeout=interval_seconds)
                except asyncio.TimeoutError:
                    pass  # Normal: sleep expired, continue loop
    finally:
        await engine.close()
        print("\n HyperAlpha loop stopped gracefully.")


def run_api_server():
    """Launch FastAPI server for HTTP-based recommendations."""
    import uvicorn
    from fastapi import FastAPI
    from fastapi.middleware.cors import CORSMiddleware
    from pydantic import BaseModel
    from typing import Optional

    app = FastAPI(
        title="HyperAlpha API",
        description="AI Multi-Agent Trading Desk for Hyperliquid",
        version="0.1.0",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000", "https://*.vercel.app"],
        allow_methods=["*"],
        allow_headers=["*"],
    )

    class AnalyzeRequest(BaseModel):
        ticker: str
        market: str = "perp"

    class AnalyzeResponse(BaseModel):
        ticker: str
        action: str
        confidence: float
        entry_price: Optional[float] = None
        stop_loss: Optional[float] = None
        take_profit: Optional[float] = None
        size_usd: Optional[float] = None
        leverage: Optional[float] = None
        approved: bool
        signal_alignment: int = 0
        risk_score: float = 0
        report: str
        errors: list[str] = []

    @app.post("/analyze", response_model=AnalyzeResponse)
    async def analyze_ticker(req: AnalyzeRequest):
        engine = HyperAlphaEngine()
        try:
            state = await engine.analyze(req.ticker.upper())
            decision = state.get("final_decision")
            rec = decision.recommendation if decision else None
            risk = decision.risk_assessment if decision else None
            report = format_decision_report(state)

            return AnalyzeResponse(
                ticker=req.ticker.upper(),
                action=rec.action if rec else "hold",
                confidence=rec.confidence if rec else 0,
                entry_price=rec.entry_price if rec else None,
                stop_loss=rec.stop_loss if rec else None,
                take_profit=rec.take_profit if rec else None,
                size_usd=rec.size_usd if rec else None,
                leverage=rec.leverage if rec else None,
                approved=decision.approved if decision else False,
                signal_alignment=rec.signal_alignment if rec else 0,
                risk_score=risk.risk_score if risk else 0,
                report=report,
                errors=state.get("errors", []),
            )
        except Exception as e:
            logger.error("api_analyze_failed", ticker=req.ticker, error=str(e))
            return AnalyzeResponse(
                ticker=req.ticker.upper(),
                action="hold",
                confidence=0,
                approved=False,
                report=f"Analysis failed: {str(e)}",
                errors=[str(e)],
            )
        finally:
            await engine.close()

    @app.get("/health")
    async def health():
        """Health check with dependency status."""
        from hyperalpha.data.hyperliquid_connector import HyperliquidConnector
        hl_status = "unknown"
        try:
            connector = HyperliquidConnector()
            mids = await connector.get_all_mids()
            hl_status = "ok" if len(mids) > 0 else "empty"
            await connector.close()
        except Exception as e:
            hl_status = f"error: {str(e)[:100]}"

        anthropic_status = "configured" if settings.anthropic_api_key else "missing_key"

        return {
            "status": "ok" if hl_status == "ok" and anthropic_status == "configured" else "degraded",
            "hyperliquid": hl_status,
            "anthropic": anthropic_status,
            "environment": settings.environment,
            "testnet": settings.hl_use_testnet,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    uvicorn.run(app, host="0.0.0.0", port=8001)


def main():
    parser = argparse.ArgumentParser(description="HyperAlpha — AI Trading Desk")
    parser.add_argument("--ticker", type=str, default="BTC", help="Ticker(s) to analyze, comma-separated")
    parser.add_argument("--mode", type=str, default="recommend", choices=["recommend", "loop", "server"])
    parser.add_argument("--interval", type=int, default=3600, help="Loop interval in seconds")
    args = parser.parse_args()

    tickers = [t.strip().upper() for t in args.ticker.split(",")]

    if args.mode == "recommend":
        asyncio.run(run_single_analysis(tickers[0]))
    elif args.mode == "loop":
        asyncio.run(run_multi_ticker_loop(tickers, args.interval))
    elif args.mode == "server":
        run_api_server()


if __name__ == "__main__":
    main()
