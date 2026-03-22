/**
 * Singleton wrapper around the nomeida `hyperliquid` SDK.
 *
 * Handles mainnet / testnet selection via env vars and exposes
 * factory helpers for the read-only InfoAPI and the authenticated ExchangeAPI.
 */

import { Hyperliquid } from 'hyperliquid';

import { HL_REST_URLS, DEFAULT_BUILDER_FEE_BPS } from './constants';
import type { HLBuilderConfig } from './types';

// ---------------------------------------------------------------------------
// Derive SDK sub-client types from the Hyperliquid class properties
// ---------------------------------------------------------------------------

export type HLInfoAPI = Hyperliquid['info'];
export type HLExchangeAPI = Hyperliquid['exchange'];

// ---------------------------------------------------------------------------
// Environment helpers
// ---------------------------------------------------------------------------

function isTestnet(): boolean {
  return process.env.NEXT_PUBLIC_HL_TESTNET === 'true';
}

function getBaseUrl(): string {
  return isTestnet() ? HL_REST_URLS.TESTNET : HL_REST_URLS.MAINNET;
}

function getBuilderConfig(): HLBuilderConfig {
  const address = process.env.NEXT_PUBLIC_HL_BUILDER_ADDRESS ?? '';
  const feeBps = Number(process.env.HL_BUILDER_FEE_BPS) || DEFAULT_BUILDER_FEE_BPS;
  return { address, feeBps };
}

// ---------------------------------------------------------------------------
// Read-only SDK singleton (no private key needed)
// ---------------------------------------------------------------------------

let readOnlySdk: Hyperliquid | null = null;

/**
 * Return the shared read-only Hyperliquid SDK instance.
 * Safe to call from server components and API routes that only need market data.
 */
async function getReadOnlySdk(): Promise<Hyperliquid> {
  if (readOnlySdk) {
    return readOnlySdk;
  }

  const sdk = new Hyperliquid({
    testnet: isTestnet(),
    enableWs: false,
  });

  await sdk.connect();
  readOnlySdk = sdk;
  return sdk;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Get the InfoAPI client for read-only queries (mids, meta, orderbook, etc.).
 *
 * Uses a module-level singleton so the connection is reused across requests.
 */
export async function getInfo(): Promise<HLInfoAPI> {
  const sdk = await getReadOnlySdk();
  return sdk.info;
}

/**
 * Create an authenticated ExchangeAPI client for placing orders, cancelling, etc.
 *
 * A new SDK instance is created per wallet key because each instance binds
 * to exactly one signer.
 *
 * @param walletKey - Hex private key of the trading wallet (without 0x prefix is fine).
 * @param vaultAddress - Optional vault address if trading on behalf of a vault.
 */
export async function createExchange(
  walletKey: string,
  vaultAddress?: string,
): Promise<HLExchangeAPI> {
  const sdk = new Hyperliquid({
    testnet: isTestnet(),
    privateKey: walletKey,
    enableWs: false,
    ...(vaultAddress ? { vaultAddress } : {}),
  });

  await sdk.connect();
  return sdk.exchange;
}

/**
 * Return the builder config derived from environment variables.
 * Downstream order helpers attach this to every order so the platform
 * collects builder fees.
 */
export function getBuilderInfo(): HLBuilderConfig {
  return getBuilderConfig();
}

/**
 * Return the REST base URL for the active network.
 * Useful when making raw HTTP calls outside the SDK.
 */
export function getRestBaseUrl(): string {
  return getBaseUrl();
}

/**
 * Whether the client is configured to talk to the testnet.
 */
export function isTestnetMode(): boolean {
  return isTestnet();
}

/**
 * Tear down the read-only singleton (useful in tests or hot-reload).
 */
export function resetReadOnlyClient(): void {
  if (readOnlySdk) {
    readOnlySdk.disconnect();
    readOnlySdk = null;
  }
}
