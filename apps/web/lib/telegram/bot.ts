// ---------------------------------------------------------------------------
// Telegram Bot Service — Core API + Types
// ---------------------------------------------------------------------------

import { z } from "zod";

const TELEGRAM_API = "https://api.telegram.org/bot";

function getBotToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not configured");
  return token;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export const parseModeSchema = z.enum(["MarkdownV2", "HTML"]).optional();
export type ParseMode = z.infer<typeof parseModeSchema>;

export interface TradeAlert {
  agentName: string;
  pair: string;
  side: "BUY" | "SELL";
  price: number;
  quantity: number;
  pnl?: number;
  isPaper: boolean;
}

export interface DailyReport {
  date: string;
  totalPnl: number;
  totalTrades: number;
  winRate: number;
  bestTrade: { pair: string; pnl: number } | null;
  worstTrade: { pair: string; pnl: number } | null;
  activeAgents: number;
}

export interface PortfolioUpdate {
  totalValue: number;
  dailyChange: number;
  dailyChangePct: number;
  positions: Array<{
    pair: string;
    side: string;
    unrealizedPnl: number;
    entryPrice: number;
    currentPrice: number;
  }>;
}

// ---------------------------------------------------------------------------
// Core send function
// ---------------------------------------------------------------------------

interface TelegramResponse {
  ok: boolean;
  description?: string;
}

export async function sendMessage(
  chatId: string,
  text: string,
  parseMode?: ParseMode,
): Promise<TelegramResponse> {
  const token = getBotToken();
  const url = `${TELEGRAM_API}${token}/sendMessage`;

  const body: Record<string, string> = {
    chat_id: chatId,
    text,
    disable_web_page_preview: "true",
  };

  if (parseMode) {
    body.parse_mode = parseMode;
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = (await res.json()) as TelegramResponse;

  if (!data.ok) {
    console.error("[Telegram] sendMessage failed:", data.description);
  }

  return data;
}

// ---------------------------------------------------------------------------
// MarkdownV2 helpers (exported for templates)
// ---------------------------------------------------------------------------

export function esc(text: string): string {
  return text.replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, "\\$1");
}

export function fmtUsd(n: number): string {
  const prefix = n >= 0 ? "\\+" : "";
  return `${prefix}\\$${esc(Math.abs(n).toFixed(2))}`;
}

export function fmtPct(n: number): string {
  const prefix = n >= 0 ? "\\+" : "";
  return `${prefix}${esc(n.toFixed(2))}%`;
}
