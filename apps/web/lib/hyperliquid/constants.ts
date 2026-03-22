/**
 * Hyperliquid network constants for Zelkora trading platform.
 */

export const HL_REST_URLS = {
  MAINNET: 'https://api.hyperliquid.xyz',
  TESTNET: 'https://api.hyperliquid-testnet.xyz',
} as const;

export const HL_WS_URLS = {
  MAINNET: 'wss://api.hyperliquid.xyz/ws',
  TESTNET: 'wss://api.hyperliquid-testnet.xyz/ws',
} as const;

export const DEFAULT_BUILDER_FEE_BPS = 5;

export const MAX_WS_SUBSCRIPTIONS = 1000;

export const SUPPORTED_PERP_ASSETS = [
  'BTC',
  'ETH',
  'SOL',
  'DOGE',
  'AVAX',
  'LINK',
  'ARB',
  'OP',
  'SUI',
  'SEI',
  'INJ',
  'TIA',
  'MATIC',
  'APT',
  'NEAR',
  'FIL',
  'ATOM',
  'RNDR',
  'WLD',
  'JUP',
] as const;

export type SupportedPerpAsset = (typeof SUPPORTED_PERP_ASSETS)[number];
