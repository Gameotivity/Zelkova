/**
 * Portfolio & Position Service for Zelkora Hyperliquid trading platform.
 *
 * Provides account state queries: open positions, equity summary,
 * leverage/margin management, and trade history.
 */

import type { HLExchangeAPI } from './client';
import { getInfo } from './client';
import type { HLFill } from './types';

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

export interface AccountSummary {
  equity: string;
  totalMarginUsed: string;
  totalUnrealizedPnl: string;
  withdrawable: string;
  totalNotionalPosition: string;
  totalRawUsd: string;
  crossMaintenanceMarginUsed: string;
}

export interface Position {
  coin: string;
  /** Signed size: positive = long, negative = short */
  size: string;
  entryPrice: string;
  unrealizedPnl: string;
  liquidationPrice: string;
  leverage: number;
  leverageType: string;
  marginUsed: string;
  positionValue: string;
  returnOnEquity: string;
  maxLeverage: number;
  cumFundingAllTime: string;
  cumFundingSinceOpen: string;
}

// ---------------------------------------------------------------------------
// Internal helpers — use generic types to avoid SDK export issues
// ---------------------------------------------------------------------------

interface CLState {
  assetPositions: Array<{
    position: {
      coin: string;
      szi: string;
      entryPx: string;
      unrealizedPnl: string;
      liquidationPx: string;
      leverage: { value: number; type: string };
      marginUsed: string;
      positionValue: string;
      returnOnEquity: string;
      maxLeverage: number;
      cumFunding: { allTime: string; sinceOpen: string };
    };
  }>;
  marginSummary: {
    accountValue: string;
    totalMarginUsed: string;
    totalNtlPos: string;
    totalRawUsd: string;
  };
  crossMarginSummary: Record<string, string>;
  withdrawable: string;
  crossMaintenanceMarginUsed: string;
}

function parsePositions(state: CLState): Position[] {
  return state.assetPositions
    .filter((ap) => Number(ap.position.szi) !== 0)
    .map((ap) => {
      const p = ap.position;
      return {
        coin: p.coin,
        size: p.szi,
        entryPrice: p.entryPx,
        unrealizedPnl: p.unrealizedPnl,
        liquidationPrice: p.liquidationPx,
        leverage: p.leverage.value,
        leverageType: p.leverage.type,
        marginUsed: p.marginUsed,
        positionValue: p.positionValue,
        returnOnEquity: p.returnOnEquity,
        maxLeverage: p.maxLeverage,
        cumFundingAllTime: p.cumFunding.allTime,
        cumFundingSinceOpen: p.cumFunding.sinceOpen,
      };
    });
}

function parseSummary(state: CLState): AccountSummary {
  const margin = state.marginSummary;

  const equity = Number(margin.accountValue);
  const rawUsd = Number(margin.totalRawUsd);
  const unrealizedPnl = (equity - rawUsd).toString();

  return {
    equity: margin.accountValue,
    totalMarginUsed: margin.totalMarginUsed,
    totalUnrealizedPnl: unrealizedPnl,
    withdrawable: state.withdrawable,
    totalNotionalPosition: margin.totalNtlPos,
    totalRawUsd: margin.totalRawUsd,
    crossMaintenanceMarginUsed: state.crossMaintenanceMarginUsed,
  };
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

/**
 * Get all open perpetual positions for a wallet.
 * Filters out zero-size entries.
 */
export async function getPositions(walletAddress: string): Promise<Position[]> {
  const info = await getInfo();
  const state = await info.perpetuals.getClearinghouseState(
    walletAddress,
    true,
  );
  return parsePositions(state as unknown as CLState);
}

/**
 * Get the full account summary including equity, margin, and withdrawable.
 */
export async function getAccountSummary(
  walletAddress: string,
): Promise<AccountSummary> {
  const info = await getInfo();
  const state = await info.perpetuals.getClearinghouseState(
    walletAddress,
    true,
  );
  return parseSummary(state as unknown as CLState);
}

/**
 * Set leverage for a given coin.
 */
export async function setLeverage(
  exchange: HLExchangeAPI,
  coin: string,
  leverage: number,
  isCross: boolean,
): Promise<boolean> {
  const mode = isCross ? 'cross' : 'isolated';
  const resp = await exchange.updateLeverage(coin, mode, leverage);
  return (resp as { status?: string })?.status === 'ok';
}

/**
 * Set margin mode (cross vs isolated) for a coin.
 */
export async function setMarginMode(
  exchange: HLExchangeAPI,
  coin: string,
  isCross: boolean,
  currentLeverage = 1,
): Promise<boolean> {
  const mode = isCross ? 'cross' : 'isolated';
  const resp = await exchange.updateLeverage(coin, mode, currentLeverage);
  return (resp as { status?: string })?.status === 'ok';
}

/**
 * Get trade history (fills) for a wallet, optionally filtered by start time.
 */
export async function getTradeHistory(
  walletAddress: string,
  startTime?: number,
  endTime?: number,
): Promise<HLFill[]> {
  const info = await getInfo();

  let raw: Array<Record<string, unknown>>;
  if (startTime !== undefined) {
    const end = endTime ?? Date.now();
    raw = await info.getUserFillsByTime(walletAddress, startTime, end, true) as Array<Record<string, unknown>>;
  } else {
    raw = await info.getUserFills(walletAddress, true) as Array<Record<string, unknown>>;
  }

  return raw.map((f) => ({
    coin: f.coin as string,
    price: f.px as string,
    size: f.sz as string,
    side: f.side as string,
    time: f.time as number,
    closedPnl: f.closedPnl as string,
    hash: f.hash as string,
    orderId: f.oid as number,
    crossed: f.crossed as boolean,
    fee: f.fee as string,
    feeToken: f.feeToken as string,
    tid: f.tid as number,
    direction: (f.dir ?? '') as string,
    startPosition: (f.startPosition ?? '0') as string,
  }));
}

/**
 * Get clearinghouse state with both positions and summary in a single call.
 */
export async function getFullAccountState(
  walletAddress: string,
): Promise<{ positions: Position[]; summary: AccountSummary }> {
  const info = await getInfo();
  const state = await info.perpetuals.getClearinghouseState(
    walletAddress,
    true,
  );
  const typed = state as unknown as CLState;
  return {
    positions: parsePositions(typed),
    summary: parseSummary(typed),
  };
}
