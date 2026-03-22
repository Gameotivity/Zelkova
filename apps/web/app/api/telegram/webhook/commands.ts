// ---------------------------------------------------------------------------
// Telegram Bot Command Handlers
// ---------------------------------------------------------------------------

import { db } from "@/lib/db";
import {
  userProfiles,
  agents,
  trades,
  positions,
} from "@/lib/db/schema";
import { eq, and, desc, gte } from "drizzle-orm";
import { sendMessage, esc } from "@/lib/telegram/bot";
import { sendWelcome } from "@/lib/telegram/templates";
import { linkCodes } from "@/lib/telegram/link-store";

// ---------------------------------------------------------------------------
// /start
// ---------------------------------------------------------------------------

export async function handleStart(chatId: string): Promise<void> {
  await sendWelcome(chatId);
}

// ---------------------------------------------------------------------------
// /link CODE
// ---------------------------------------------------------------------------

export async function handleLink(
  chatId: string,
  code: string,
  telegramUsername: string | undefined,
): Promise<void> {
  const trimmedCode = code.trim();

  if (!/^\d{6}$/.test(trimmedCode)) {
    await sendMessage(
      chatId,
      "\u{274C} Invalid code\\. Please enter a 6\\-digit code from Zelkora Settings\\.",
      "MarkdownV2",
    );
    return;
  }

  const entry = linkCodes.get(trimmedCode);

  if (!entry) {
    await sendMessage(
      chatId,
      "\u{274C} Code not found or expired\\. Generate a new one in Settings\\.",
      "MarkdownV2",
    );
    return;
  }

  if (entry.expiresAt < Date.now()) {
    linkCodes.delete(trimmedCode);
    await sendMessage(
      chatId,
      "\u{23F0} Code expired\\. Please generate a new one in Settings\\.",
      "MarkdownV2",
    );
    return;
  }

  const chatIdStr = chatId.toString();
  const tgHandle = telegramUsername ?? chatIdStr;

  await db
    .update(userProfiles)
    .set({ telegram: chatIdStr, updatedAt: new Date() })
    .where(eq(userProfiles.userId, entry.userId));

  linkCodes.delete(trimmedCode);

  await sendMessage(
    chatId,
    [
      `\u{2705} *Account linked successfully\\!*`,
      "",
      `Welcome, *${esc(tgHandle)}*\\. You'll now receive trading alerts here\\.`,
      "",
      "Use /help to see available commands\\.",
    ].join("\n"),
    "MarkdownV2",
  );
}

// ---------------------------------------------------------------------------
// Helper: resolve user from chatId
// ---------------------------------------------------------------------------

async function getProfileByChatId(chatId: string) {
  const [profile] = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.telegram, chatId))
    .limit(1);
  return profile ?? null;
}

async function requireLinked(chatId: string) {
  const profile = await getProfileByChatId(chatId);
  if (!profile) {
    await sendMessage(
      chatId,
      "\u{1F517} Account not linked\\. Use /start to learn how to connect\\.",
      "MarkdownV2",
    );
    return null;
  }
  return profile;
}

// ---------------------------------------------------------------------------
// /portfolio
// ---------------------------------------------------------------------------

export async function handlePortfolio(chatId: string): Promise<void> {
  const profile = await requireLinked(chatId);
  if (!profile) return;

  const openPositions = await db
    .select()
    .from(positions)
    .innerJoin(agents, eq(positions.agentId, agents.id))
    .where(and(eq(agents.userId, profile.userId), eq(positions.isOpen, true)));

  if (openPositions.length === 0) {
    await sendMessage(chatId, "\u{1F4BC} *Portfolio*\n\nNo open positions\\.", "MarkdownV2");
    return;
  }

  let totalUnrealized = 0;
  const lines = openPositions.slice(0, 10).map((row) => {
    const p = row.positions;
    totalUnrealized += p.unrealizedPnl;
    const icon = p.unrealizedPnl >= 0 ? "\u{1F7E2}" : "\u{1F534}";
    const pnl = p.unrealizedPnl >= 0
      ? `\\+\\$${esc(p.unrealizedPnl.toFixed(2))}`
      : `\\-\\$${esc(Math.abs(p.unrealizedPnl).toFixed(2))}`;
    return `${icon} \`${esc(p.pair)}\` ${esc(p.side)} @ \\$${esc(p.currentPrice.toFixed(2))} ${pnl}`;
  });

  const totalIcon = totalUnrealized >= 0 ? "\u{1F4C8}" : "\u{1F4C9}";
  const totalStr = totalUnrealized >= 0
    ? `\\+\\$${esc(totalUnrealized.toFixed(2))}`
    : `\\-\\$${esc(Math.abs(totalUnrealized).toFixed(2))}`;

  const msg = [
    `\u{1F4BC} *Portfolio Summary*`,
    "",
    ...lines,
    "",
    `${totalIcon} *Unrealized P&L:* ${totalStr}`,
    "",
    `_${esc(new Date().toUTCString())}_`,
  ].join("\n");

  await sendMessage(chatId, msg, "MarkdownV2");
}

// ---------------------------------------------------------------------------
// /agents
// ---------------------------------------------------------------------------

export async function handleAgents(chatId: string): Promise<void> {
  const profile = await requireLinked(chatId);
  if (!profile) return;

  const userAgents = await db
    .select()
    .from(agents)
    .where(eq(agents.userId, profile.userId))
    .orderBy(desc(agents.createdAt));

  if (userAgents.length === 0) {
    await sendMessage(
      chatId,
      "\u{1F916} *Your Agents*\n\nNo agents created yet\\. Build one at zelkora\\.ai\\!",
      "MarkdownV2",
    );
    return;
  }

  const statusIcons: Record<string, string> = {
    DRAFT: "\u{270F}\u{FE0F}",
    PAPER: "\u{1F4DD}",
    LIVE: "\u{1F7E2}",
    PAUSED: "\u{23F8}\u{FE0F}",
    STOPPED: "\u{1F534}",
  };

  const lines = userAgents.slice(0, 10).map((a) => {
    const icon = statusIcons[a.status] ?? "\u{2753}";
    const pairsStr = Array.isArray(a.pairs) ? a.pairs.slice(0, 3).join(", ") : "\\-";
    return `${icon} *${esc(a.name)}* \\[${esc(a.status)}\\]\n    ${esc(a.strategy)} \\| ${esc(pairsStr)}`;
  });

  const msg = [
    `\u{1F916} *Your Agents \\(${esc(userAgents.length.toString())}\\)*`,
    "",
    ...lines,
  ].join("\n");

  await sendMessage(chatId, msg, "MarkdownV2");
}

// ---------------------------------------------------------------------------
// /report
// ---------------------------------------------------------------------------

export async function handleReport(chatId: string): Promise<void> {
  const profile = await requireLinked(chatId);
  if (!profile) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayTrades = await db
    .select()
    .from(trades)
    .where(and(eq(trades.userId, profile.userId), gte(trades.createdAt, today)));

  const totalPnl = todayTrades.reduce((sum, t) => sum + (t.pnl ?? 0), 0);
  const wins = todayTrades.filter((t) => (t.pnl ?? 0) > 0).length;
  const winRate = todayTrades.length > 0 ? (wins / todayTrades.length) * 100 : 0;

  const pnlIcon = totalPnl >= 0 ? "\u{2705}" : "\u{274C}";
  const pnlStr = totalPnl >= 0
    ? `\\+\\$${esc(totalPnl.toFixed(2))}`
    : `\\-\\$${esc(Math.abs(totalPnl).toFixed(2))}`;

  const msg = [
    `\u{1F4CA} *Daily Report \\- ${esc(today.toISOString().split("T")[0] ?? "")}*`,
    "",
    `${pnlIcon} *Total P&L:* ${pnlStr}`,
    `\u{1F504} *Trades:* ${esc(todayTrades.length.toString())}`,
    `\u{1F3AF} *Win Rate:* ${esc(winRate.toFixed(1))}%`,
    "",
    "_Powered by Zelkora\\.ai_",
  ].join("\n");

  await sendMessage(chatId, msg, "MarkdownV2");
}

// ---------------------------------------------------------------------------
// /help
// ---------------------------------------------------------------------------

export async function handleHelp(chatId: string): Promise<void> {
  const msg = [
    `\u{2753} *Zelkora Bot Commands*`,
    "",
    "/start \\- Welcome & setup guide",
    "/link `CODE` \\- Link your Zelkora account",
    "/portfolio \\- View open positions",
    "/agents \\- List your trading agents",
    "/report \\- Today's P&L report",
    "/help \\- Show this message",
    "",
    "\u{1F310} [zelkora\\.ai](https://zelkora.ai)",
  ].join("\n");

  await sendMessage(chatId, msg, "MarkdownV2");
}
