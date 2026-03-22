/**
 * Re-exports from hl-executor for backwards compatibility.
 * The worker now uses Hyperliquid REST API for all price data.
 */
export { executePaperTrade, fetchLivePrice } from './hl-executor';
export { fetchCandles as fetchLiveCandles } from './hl-data';
