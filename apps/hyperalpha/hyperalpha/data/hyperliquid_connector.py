"""
HyperAlpha — Hyperliquid Data Connector (Production-grade)

Features:
- Retry with exponential backoff
- In-memory cache with TTL
- Response validation
- Graceful error handling
"""
import asyncio
import time
import aiohttp
import orjson
from datetime import datetime, timedelta, timezone
from typing import Optional
from dataclasses import dataclass
import structlog

from hyperalpha.config import settings

logger = structlog.get_logger()

INFO_URL = f"{settings.hl_api_url}/info"


# ─── Cache ───────────────────────────────────

class TTLCache:
    """Simple in-memory cache with per-key TTL."""

    def __init__(self):
        self._data: dict[str, tuple[float, object]] = {}

    def get(self, key: str) -> Optional[object]:
        entry = self._data.get(key)
        if entry and entry[0] > time.time():
            return entry[1]
        if entry:
            del self._data[key]
        return None

    def set(self, key: str, value: object, ttl: int):
        self._data[key] = (time.time() + ttl, value)

    def clear(self):
        self._data.clear()


_cache = TTLCache()


# ─── Market Snapshot ─────────────────────────

@dataclass
class MarketSnapshot:
    """Complete market snapshot for a single asset."""
    ticker: str
    mid_price: float
    mark_price: float
    funding_rate: float
    predicted_funding_rate: float
    open_interest: float
    volume_24h: float
    price_change_24h_pct: float
    best_bid: float
    best_ask: float
    spread_bps: float
    order_book_imbalance: float
    candles: list[dict]
    timestamp: datetime


# ─── Connector ───────────────────────────────

class HyperliquidConnector:
    """Async connector to Hyperliquid's info API with retry and caching."""

    def __init__(self):
        self.session: Optional[aiohttp.ClientSession] = None

    async def _ensure_session(self):
        if self.session is None or self.session.closed:
            timeout = aiohttp.ClientTimeout(total=settings.hl_request_timeout)
            self.session = aiohttp.ClientSession(
                json_serialize=lambda x: orjson.dumps(x).decode(),
                timeout=timeout,
            )

    async def _post(self, payload: dict, retries: int = 0) -> dict:
        """POST to Hyperliquid info endpoint with retry logic."""
        max_retries = settings.hl_max_retries
        await self._ensure_session()

        for attempt in range(max_retries):
            try:
                async with self.session.post(
                    INFO_URL,
                    json=payload,
                    headers={"Content-Type": "application/json"},
                ) as resp:
                    if resp.status != 200:
                        raise aiohttp.ClientError(f"HL API returned {resp.status}")
                    return await resp.json()
            except (aiohttp.ClientError, asyncio.TimeoutError) as e:
                if attempt == max_retries - 1:
                    logger.error("hl_api_failed", payload_type=payload.get("type"), error=str(e), attempts=max_retries)
                    raise
                wait = (2 ** attempt) * 0.5  # 0.5s, 1s, 2s
                logger.warning("hl_api_retry", attempt=attempt + 1, wait=wait, error=str(e))
                await asyncio.sleep(wait)

        raise RuntimeError("Unreachable")

    async def get_all_mids(self) -> dict[str, float]:
        """Get mid prices for all assets (cached)."""
        cached = _cache.get("all_mids")
        if cached:
            return cached

        data = await self._post({"type": "allMids"})
        result = {}
        for k, v in data.items():
            try:
                result[k] = float(v)
            except (ValueError, TypeError):
                continue

        _cache.set("all_mids", result, settings.cache_mids_ttl)
        return result

    async def get_funding_rates(self) -> list[dict]:
        """Get current funding rates for all perps (cached)."""
        cached = _cache.get("funding_rates")
        if cached:
            return cached

        try:
            ctx_data = await self._post({"type": "metaAndAssetCtxs"})
        except Exception as e:
            logger.error("funding_rates_failed", error=str(e))
            return []

        rates = []
        if isinstance(ctx_data, list) and len(ctx_data) > 1:
            universe = ctx_data[0].get("universe", [])
            contexts = ctx_data[1]
            for asset, ctx in zip(universe, contexts):
                mid_px = float(ctx.get("midPx", 0) or 0)
                prev_px = float(ctx.get("prevDayPx", 0) or 0)
                change_pct = ((mid_px - prev_px) / prev_px * 100) if prev_px > 0 else 0

                rates.append({
                    "ticker": asset["name"],
                    "funding_rate": float(ctx.get("funding", 0) or 0),
                    "open_interest": float(ctx.get("openInterest", 0) or 0),
                    "mark_price": float(ctx.get("markPx", 0) or 0),
                    "mid_price": mid_px,
                    "volume_24h": float(ctx.get("dayNtlVlm", 0) or 0),
                    "price_change_24h_pct": round(change_pct, 2),
                })

        _cache.set("funding_rates", rates, settings.cache_funding_ttl)
        return rates

    async def get_order_book(self, ticker: str, depth: int = 20) -> dict:
        """Get L2 order book for an asset."""
        try:
            data = await self._post({
                "type": "l2Book",
                "coin": ticker,
                "nSigFigs": 5,
            })
        except Exception as e:
            logger.error("order_book_failed", ticker=ticker, error=str(e))
            return {"bids": [], "asks": [], "best_bid": 0, "best_ask": 0, "spread_bps": 0, "imbalance": 0}

        levels = data.get("levels", [[], []])
        bids = [(float(b["px"]), float(b["sz"])) for b in levels[0][:depth]] if len(levels) > 0 else []
        asks = [(float(a["px"]), float(a["sz"])) for a in levels[1][:depth]] if len(levels) > 1 else []

        bid_volume = sum(sz for _, sz in bids)
        ask_volume = sum(sz for _, sz in asks)
        total_volume = bid_volume + ask_volume

        best_bid = bids[0][0] if len(bids) > 0 else 0
        best_ask = asks[0][0] if len(asks) > 0 else 0
        spread_bps = ((best_ask - best_bid) / best_bid * 10000) if best_bid > 0 and best_ask > 0 else 0

        return {
            "bids": bids,
            "asks": asks,
            "best_bid": best_bid,
            "best_ask": best_ask,
            "spread_bps": round(spread_bps, 2),
            "imbalance": round((bid_volume - ask_volume) / total_volume, 4) if total_volume > 0 else 0,
        }

    async def get_candles(
        self, ticker: str, interval: str = "1h", lookback_hours: int = 168
    ) -> list[dict]:
        """Get OHLCV candles with validation."""
        now = int(datetime.now(timezone.utc).timestamp() * 1000)
        start = int((datetime.now(timezone.utc) - timedelta(hours=lookback_hours)).timestamp() * 1000)

        try:
            data = await self._post({
                "type": "candleSnapshot",
                "req": {"coin": ticker, "interval": interval, "startTime": start, "endTime": now},
            })
        except Exception as e:
            logger.error("candles_failed", ticker=ticker, interval=interval, error=str(e))
            return []

        if not isinstance(data, list):
            return []

        return [
            {
                "timestamp": c.get("t", 0),
                "open": float(c.get("o", 0)),
                "high": float(c.get("h", 0)),
                "low": float(c.get("l", 0)),
                "close": float(c.get("c", 0)),
                "volume": float(c.get("v", 0)),
            }
            for c in data
        ]

    async def get_user_state(self, address: Optional[str] = None) -> dict:
        """Get user's current positions and margin."""
        addr = address or settings.hl_account_address
        if not addr:
            return {}
        try:
            return await self._post({"type": "clearinghouseState", "user": addr})
        except Exception as e:
            logger.error("user_state_failed", error=str(e))
            return {}

    async def get_market_snapshot(self, ticker: str) -> MarketSnapshot:
        """Build a complete market snapshot with error handling."""
        cache_key = f"snapshot:{ticker}"
        cached = _cache.get(cache_key)
        if cached:
            return cached

        logger.info("building_market_snapshot", ticker=ticker)

        # Fetch all data concurrently with error tolerance
        results = await asyncio.gather(
            self.get_all_mids(),
            self.get_funding_rates(),
            self.get_order_book(ticker),
            self.get_candles(ticker, "1h", 168),
            self.get_candles(ticker, "4h", 720),
            return_exceptions=True,
        )

        mids = results[0] if not isinstance(results[0], Exception) else {}
        funding_data = results[1] if not isinstance(results[1], Exception) else []
        book = results[2] if not isinstance(results[2], Exception) else {"best_bid": 0, "best_ask": 0, "spread_bps": 0, "imbalance": 0}
        candles_1h = results[3] if not isinstance(results[3], Exception) else []
        candles_4h = results[4] if not isinstance(results[4], Exception) else []

        mid_price = mids.get(ticker, 0)

        # Find this ticker's funding data
        ticker_funding = next(
            (f for f in funding_data if f["ticker"] == ticker),
            {"funding_rate": 0, "open_interest": 0, "volume_24h": 0, "mark_price": mid_price, "price_change_24h_pct": 0},
        )

        # Calculate 24h price change safely
        if len(candles_1h) >= 24:
            price_24h_ago = candles_1h[-24]["close"]
            change_pct = ((mid_price - price_24h_ago) / price_24h_ago * 100) if price_24h_ago > 0 else 0
        else:
            change_pct = ticker_funding.get("price_change_24h_pct", 0)

        snapshot = MarketSnapshot(
            ticker=ticker,
            mid_price=mid_price,
            mark_price=ticker_funding.get("mark_price", mid_price),
            funding_rate=ticker_funding["funding_rate"],
            predicted_funding_rate=ticker_funding["funding_rate"],
            open_interest=ticker_funding["open_interest"],
            volume_24h=ticker_funding["volume_24h"],
            price_change_24h_pct=round(change_pct, 2),
            best_bid=book.get("best_bid", 0),
            best_ask=book.get("best_ask", 0),
            spread_bps=book.get("spread_bps", 0),
            order_book_imbalance=book.get("imbalance", 0),
            candles=[
                {"interval": "1h", "data": candles_1h},
                {"interval": "4h", "data": candles_4h},
            ],
            timestamp=datetime.now(timezone.utc),
        )

        _cache.set(cache_key, snapshot, settings.cache_snapshot_ttl)
        return snapshot

    async def close(self):
        if self.session and not self.session.closed:
            await self.session.close()
        _cache.clear()
