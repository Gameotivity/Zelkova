"""HyperAlpha — Hyperliquid Order Executor.

Signs and places real orders on Hyperliquid (mainnet or testnet)
using raw HTTP + SDK signing utils. Bypasses the SDK's Info/Exchange
wrappers which have testnet compatibility bugs.
"""
from __future__ import annotations

import math
import time
import requests
import structlog
from typing import Optional
from dataclasses import dataclass

from eth_account import Account as EthAccount
from hyperliquid.utils import constants, signing

from hyperalpha.config import settings

logger = structlog.get_logger(__name__)


@dataclass
class OrderResult:
    """Result of an order placement attempt."""
    success: bool
    order_id: Optional[str] = None
    status: str = ""
    filled_size: float = 0.0
    avg_price: float = 0.0
    error: str = ""


@dataclass
class PositionInfo:
    """Current position on Hyperliquid."""
    ticker: str
    side: str  # "long" or "short"
    size: float  # in units
    entry_price: float
    unrealized_pnl: float
    leverage: float
    liquidation_price: float
    margin_used: float


# ─── Asset Metadata ────────────────────────────

class AssetRegistry:
    """Maps ticker names to asset IDs using meta endpoint."""

    def __init__(self, base_url: str):
        self._base_url = base_url
        self._name_to_id: dict[str, int] = {}
        self._sz_decimals: dict[str, int] = {}
        self._loaded = False

    def _load(self):
        if self._loaded:
            return
        try:
            resp = requests.post(
                f"{self._base_url}/info",
                json={"type": "meta"},
                timeout=10,
            )
            meta = resp.json()
            for i, asset in enumerate(meta.get("universe", [])):
                name = asset["name"]
                self._name_to_id[name] = i
                sz_dec = asset.get("szDecimals", 2)
                self._sz_decimals[name] = sz_dec
            self._loaded = True
            logger.info("asset_registry_loaded", count=len(self._name_to_id))
        except Exception as e:
            logger.error("asset_registry_failed", error=str(e))

    def get_asset_id(self, ticker: str) -> int:
        self._load()
        asset_id = self._name_to_id.get(ticker)
        if asset_id is None:
            raise ValueError(f"Unknown ticker: {ticker}")
        return asset_id

    def get_sz_decimals(self, ticker: str) -> int:
        self._load()
        return self._sz_decimals.get(ticker, 2)

    def round_size(self, size: float, ticker: str) -> float:
        dec = self.get_sz_decimals(ticker)
        return round(size, dec)

    def round_price(self, price: float, ticker: str) -> float:
        """Round price to 5 significant figures (HL requirement)."""
        if price == 0:
            return 0
        sig_figs = 5
        digits = sig_figs - int(math.floor(math.log10(abs(price)))) - 1
        return round(price, max(0, digits))


# ─── Executor ──────────────────────────────────

class HyperliquidExecutor:
    """Manages order execution on Hyperliquid via raw HTTP + SDK signing."""

    def __init__(
        self,
        secret_key: str = "",
        account_address: str = "",
        use_testnet: bool = True,
    ):
        self._secret_key = secret_key or settings.hl_secret_key
        self._account_address = account_address or settings.hl_account_address
        self._use_testnet = use_testnet

        if not self._secret_key:
            raise ValueError(
                "HL_SECRET_KEY is required for execution. "
                "Set it in .env or pass secret_key param."
            )

        self._base_url = (
            constants.TESTNET_API_URL
            if self._use_testnet
            else constants.MAINNET_API_URL
        )
        self._is_mainnet = not self._use_testnet

        # Build wallet from secret key
        self._wallet = EthAccount.from_key(self._secret_key)
        self._address = self._account_address or self._wallet.address

        # Asset metadata
        self._registry = AssetRegistry(self._base_url)

        logger.info(
            "executor_init",
            network="testnet" if self._use_testnet else "MAINNET",
            address=self._address[:10] + "...",
        )

    # ─── Raw HTTP helpers ──────────────────────

    def _info_post(self, payload: dict) -> dict:
        """POST to /info endpoint."""
        resp = requests.post(
            f"{self._base_url}/info",
            json=payload,
            timeout=15,
        )
        resp.raise_for_status()
        return resp.json()

    def _exchange_post(self, action: dict, nonce: int) -> dict:
        """Sign and POST to /exchange endpoint."""
        signature = signing.sign_l1_action(
            self._wallet,
            action,
            None,  # active_pool (vault)
            nonce,
            0,  # expires_after (0 = no expiry)
            self._is_mainnet,
        )
        payload = {
            "action": action,
            "nonce": nonce,
            "signature": signature,
            "vaultAddress": None,
        }
        resp = requests.post(
            f"{self._base_url}/exchange",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=15,
        )
        resp.raise_for_status()
        return resp.json()

    def _nonce(self) -> int:
        return int(time.time() * 1000)

    # ─── Account State ─────────────────────────

    def get_account_value(self) -> float:
        """Get total account equity in USD."""
        try:
            state = self._info_post({
                "type": "clearinghouseState",
                "user": self._address,
            })
            return float(state.get("marginSummary", {}).get("accountValue", 0))
        except Exception as e:
            logger.error("account_value_failed", error=str(e))
            return 0.0

    def get_available_balance(self) -> float:
        """Get withdrawable balance."""
        try:
            state = self._info_post({
                "type": "clearinghouseState",
                "user": self._address,
            })
            margin = state.get("marginSummary", {})
            account_value = float(margin.get("accountValue", 0))
            total_margin = float(margin.get("totalMarginUsed", 0))
            return max(0, account_value - total_margin)
        except Exception as e:
            logger.error("balance_failed", error=str(e))
            return 0.0

    def get_mid_price(self, ticker: str) -> float:
        """Get current mid price for a ticker."""
        try:
            mids = self._info_post({"type": "allMids"})
            return float(mids.get(ticker, 0))
        except Exception as e:
            logger.error("mid_price_failed", ticker=ticker, error=str(e))
            return 0.0

    def get_positions(self) -> list[PositionInfo]:
        """Get all open positions."""
        try:
            state = self._info_post({
                "type": "clearinghouseState",
                "user": self._address,
            })
            positions = []
            for pos in state.get("assetPositions", []):
                p = pos.get("position", {})
                sz = float(p.get("szi", 0))
                if sz == 0:
                    continue
                lev_data = p.get("leverage", {})
                lev_val = lev_data.get("value", 1) if isinstance(lev_data, dict) else lev_data
                positions.append(PositionInfo(
                    ticker=p.get("coin", ""),
                    side="long" if sz > 0 else "short",
                    size=abs(sz),
                    entry_price=float(p.get("entryPx", 0)),
                    unrealized_pnl=float(p.get("unrealizedPnl", 0)),
                    leverage=float(lev_val),
                    liquidation_price=float(p.get("liquidationPx", 0) or 0),
                    margin_used=float(p.get("marginUsed", 0)),
                ))
            return positions
        except Exception as e:
            logger.error("positions_failed", error=str(e))
            return []

    def get_position(self, ticker: str) -> Optional[PositionInfo]:
        """Get position for a specific ticker."""
        for pos in self.get_positions():
            if pos.ticker == ticker:
                return pos
        return None

    def get_open_orders(self) -> list[dict]:
        """Get all open orders."""
        try:
            return self._info_post({
                "type": "openOrders",
                "user": self._address,
            })
        except Exception as e:
            logger.error("open_orders_failed", error=str(e))
            return []

    # ─── Order Placement ───────────────────────

    def set_leverage(self, ticker: str, leverage: int) -> bool:
        """Set leverage for a ticker."""
        try:
            asset_id = self._registry.get_asset_id(ticker)
            lev = max(1, min(50, int(leverage)))
            action = {
                "type": "updateLeverage",
                "asset": asset_id,
                "isCross": True,
                "leverage": lev,
            }
            result = self._exchange_post(action, self._nonce())
            ok = result.get("status") == "ok"
            logger.info("leverage_set", ticker=ticker, leverage=lev, ok=ok)
            return ok
        except Exception as e:
            logger.error("leverage_failed", ticker=ticker, error=str(e))
            return False

    def market_open(
        self,
        ticker: str,
        is_buy: bool,
        size: float,
        slippage: float = 0.03,
    ) -> OrderResult:
        """Open a position with a market order (IOC with slippage)."""
        try:
            mid = self.get_mid_price(ticker)
            if mid == 0:
                return OrderResult(success=False, error="Cannot get mid price")

            # Apply slippage to get limit price for IOC order
            if is_buy:
                px = self._registry.round_price(mid * (1 + slippage), ticker)
            else:
                px = self._registry.round_price(mid * (1 - slippage), ticker)

            sz = self._registry.round_size(size, ticker)
            asset_id = self._registry.get_asset_id(ticker)

            order_wire = {
                "a": asset_id,
                "b": is_buy,
                "p": str(px),
                "s": str(sz),
                "r": False,  # reduce_only
                "t": {"limit": {"tif": "Ioc"}},
            }

            action = signing.order_wires_to_order_action([order_wire])
            result = self._exchange_post(action, self._nonce())
            return self._parse_order_result(result, ticker, "market_open")

        except Exception as e:
            logger.error("market_open_failed", ticker=ticker, error=str(e))
            return OrderResult(success=False, error=str(e))

    def market_close(self, ticker: str, slippage: float = 0.03) -> OrderResult:
        """Close entire position for a ticker."""
        try:
            pos = self.get_position(ticker)
            if pos is None:
                return OrderResult(success=False, error=f"No position in {ticker}")

            is_buy = pos.side == "short"  # Close = opposite direction
            return self.market_open(ticker, is_buy, pos.size, slippage)

        except Exception as e:
            logger.error("market_close_failed", ticker=ticker, error=str(e))
            return OrderResult(success=False, error=str(e))

    def limit_order(
        self,
        ticker: str,
        is_buy: bool,
        size: float,
        price: float,
        reduce_only: bool = False,
    ) -> OrderResult:
        """Place a GTC limit order."""
        try:
            sz = self._registry.round_size(size, ticker)
            px = self._registry.round_price(price, ticker)
            asset_id = self._registry.get_asset_id(ticker)

            order_wire = {
                "a": asset_id,
                "b": is_buy,
                "p": str(px),
                "s": str(sz),
                "r": reduce_only,
                "t": {"limit": {"tif": "Gtc"}},
            }

            action = signing.order_wires_to_order_action([order_wire])
            result = self._exchange_post(action, self._nonce())
            return self._parse_order_result(result, ticker, "limit")

        except Exception as e:
            logger.error("limit_order_failed", ticker=ticker, error=str(e))
            return OrderResult(success=False, error=str(e))

    def place_tp_sl(
        self,
        ticker: str,
        is_buy: bool,
        size: float,
        trigger_price: float,
        order_type: str = "sl",
    ) -> OrderResult:
        """Place a TP or SL trigger order."""
        try:
            sz = self._registry.round_size(size, ticker)
            trigger_px = self._registry.round_price(trigger_price, ticker)
            asset_id = self._registry.get_asset_id(ticker)
            tp_sl = "tp" if order_type == "tp" else "sl"

            order_wire = {
                "a": asset_id,
                "b": is_buy,
                "p": str(trigger_px),
                "s": str(sz),
                "r": True,  # reduce_only for TP/SL
                "t": {
                    "trigger": {
                        "triggerPx": str(trigger_px),
                        "isMarket": True,
                        "tpsl": tp_sl,
                    }
                },
            }

            action = signing.order_wires_to_order_action([order_wire])
            result = self._exchange_post(action, self._nonce())
            return self._parse_order_result(result, ticker, f"trigger_{tp_sl}")

        except Exception as e:
            logger.error("tp_sl_failed", ticker=ticker, error=str(e))
            return OrderResult(success=False, error=str(e))

    def cancel_all(self, ticker: str) -> bool:
        """Cancel all open orders for a ticker."""
        try:
            orders = self.get_open_orders()
            ticker_orders = [o for o in orders if o.get("coin") == ticker]
            if not ticker_orders:
                return True

            asset_id = self._registry.get_asset_id(ticker)
            cancels = [
                {"asset": asset_id, "oid": o["oid"]}
                for o in ticker_orders
            ]
            action = {
                "type": "cancel",
                "cancels": cancels,
            }
            result = self._exchange_post(action, self._nonce())
            ok = result.get("status") == "ok"
            logger.info("cancel_all", ticker=ticker, count=len(cancels), ok=ok)
            return ok
        except Exception as e:
            logger.error("cancel_all_failed", ticker=ticker, error=str(e))
            return False

    # ─── Helpers ───────────────────────────────

    def _parse_order_result(
        self, result: dict, ticker: str, action: str,
    ) -> OrderResult:
        """Parse exchange response into OrderResult."""
        status = result.get("status", "unknown")
        response = result.get("response", {})

        if status == "ok":
            data = response.get("data", {})
            statuses = data.get("statuses", [])

            if statuses and isinstance(statuses[0], dict):
                first = statuses[0]
                if "filled" in first:
                    filled = first["filled"]
                    oid = str(filled.get("oid", ""))
                    avg_px = float(filled.get("avgPx", 0))
                    total_sz = float(filled.get("totalSz", 0))
                    logger.info(
                        "order_filled", action=action, ticker=ticker,
                        oid=oid, avg_price=avg_px, size=total_sz,
                    )
                    return OrderResult(
                        success=True, order_id=oid,
                        status="filled", filled_size=total_sz,
                        avg_price=avg_px,
                    )
                elif "resting" in first:
                    resting = first["resting"]
                    oid = str(resting.get("oid", ""))
                    logger.info(
                        "order_resting", action=action, ticker=ticker, oid=oid,
                    )
                    return OrderResult(
                        success=True, order_id=oid, status="resting",
                    )
                elif "error" in first:
                    err = first["error"]
                    logger.warning(
                        "order_rejected", action=action, ticker=ticker, error=err,
                    )
                    return OrderResult(success=False, error=err, status="rejected")

            logger.info("order_submitted", action=action, ticker=ticker, raw=result)
            return OrderResult(success=True, status="submitted")

        err_msg = str(response) if response else str(result)
        logger.error("order_failed", action=action, ticker=ticker, error=err_msg)
        return OrderResult(success=False, error=err_msg)
