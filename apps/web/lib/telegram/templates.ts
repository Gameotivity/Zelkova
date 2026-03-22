// ---------------------------------------------------------------------------
// Telegram Message Templates — Formatted notifications
// ---------------------------------------------------------------------------

import {
  sendMessage,
  esc,
  fmtUsd,
  fmtPct,
  type TradeAlert,
  type DailyReport,
  type PortfolioUpdate,
} from "./bot";

// ---------------------------------------------------------------------------
// Trade alert
// ---------------------------------------------------------------------------

export async function sendTradeAlert(
  chatId: string,
  trade: TradeAlert,
) {
  const icon = trade.side === "BUY" ? "\u{1F7E2}" : "\u{1F534}";
  const mode = trade.isPaper ? "\u{1F4DD} Paper" : "\u{1F4B0} Live";
  const pnlLine =
    trade.pnl !== undefined
      ? `\n\u{1F4CA} *P&L:* ${fmtUsd(trade.pnl)}`
      : "";

  const msg = [
    `${icon} *Trade Executed*`,
    "",
    `\u{1F916} *Agent:* ${esc(trade.agentName)}`,
    `\u{1F4B1} *Pair:* \`${esc(trade.pair)}\``,
    `\u{2194}\u{FE0F} *Side:* ${esc(trade.side)}`,
    `\u{1F4B5} *Price:* \\$${esc(trade.price.toFixed(2))}`,
    `\u{1F4E6} *Qty:* ${esc(trade.quantity.toString())}`,
    pnlLine,
    `\u{1F3AF} *Mode:* ${mode}`,
    "",
    `_${esc(new Date().toUTCString())}_`,
  ]
    .filter(Boolean)
    .join("\n");

  return sendMessage(chatId, msg, "MarkdownV2");
}

// ---------------------------------------------------------------------------
// Daily P&L report
// ---------------------------------------------------------------------------

export async function sendDailyReport(
  chatId: string,
  report: DailyReport,
) {
  const pnlIcon = report.totalPnl >= 0 ? "\u{2705}" : "\u{274C}";

  const bestLine = report.bestTrade
    ? `\u{1F3C6} *Best:* ${esc(report.bestTrade.pair)} ${fmtUsd(report.bestTrade.pnl)}`
    : "";
  const worstLine = report.worstTrade
    ? `\u{1F4C9} *Worst:* ${esc(report.worstTrade.pair)} ${fmtUsd(report.worstTrade.pnl)}`
    : "";

  const msg = [
    `\u{1F4CA} *Daily Report \\- ${esc(report.date)}*`,
    "",
    `${pnlIcon} *Total P&L:* ${fmtUsd(report.totalPnl)}`,
    `\u{1F504} *Trades:* ${esc(report.totalTrades.toString())}`,
    `\u{1F3AF} *Win Rate:* ${fmtPct(report.winRate)}`,
    `\u{1F916} *Active Agents:* ${esc(report.activeAgents.toString())}`,
    "",
    bestLine,
    worstLine,
    "",
    "_Powered by Zelkora\\.ai_",
  ]
    .filter(Boolean)
    .join("\n");

  return sendMessage(chatId, msg, "MarkdownV2");
}

// ---------------------------------------------------------------------------
// Portfolio update
// ---------------------------------------------------------------------------

export async function sendPortfolioUpdate(
  chatId: string,
  portfolio: PortfolioUpdate,
) {
  const changeIcon = portfolio.dailyChange >= 0 ? "\u{1F4C8}" : "\u{1F4C9}";

  const positionLines = portfolio.positions.slice(0, 5).map((p) => {
    const pnlIcon = p.unrealizedPnl >= 0 ? "\u{1F7E2}" : "\u{1F534}";
    return `  ${pnlIcon} \`${esc(p.pair)}\` ${esc(p.side)} ${fmtUsd(p.unrealizedPnl)}`;
  });

  const msg = [
    `\u{1F4BC} *Portfolio Update*`,
    "",
    `\u{1F4B0} *Value:* \\$${esc(portfolio.totalValue.toFixed(2))}`,
    `${changeIcon} *24h:* ${fmtUsd(portfolio.dailyChange)} \\(${fmtPct(portfolio.dailyChangePct)}\\)`,
    "",
    portfolio.positions.length > 0 ? `*Open Positions:*` : "",
    ...positionLines,
    "",
    `_${esc(new Date().toUTCString())}_`,
  ]
    .filter(Boolean)
    .join("\n");

  return sendMessage(chatId, msg, "MarkdownV2");
}

// ---------------------------------------------------------------------------
// Welcome message
// ---------------------------------------------------------------------------

export async function sendWelcome(chatId: string) {
  const msg = [
    `\u{1F680} *Welcome to Zelkora Bot\\!*`,
    "",
    "Your autonomous trading companion is ready\\.",
    "",
    `\u{1F517} *Link your account:*`,
    "1\\. Go to *Settings \\> Notifications* in Zelkora",
    "2\\. Click *Connect Telegram*",
    "3\\. Send `/link YOUR_CODE` here",
    "",
    "*Commands:*",
    "/portfolio \\- View your portfolio",
    "/agents \\- List your active agents",
    "/report \\- Latest daily P&L report",
    "/help \\- Show all commands",
    "",
    "_Trade smarter with Zelkora\\.ai_",
  ].join("\n");

  return sendMessage(chatId, msg, "MarkdownV2");
}

// ---------------------------------------------------------------------------
// Agent status change
// ---------------------------------------------------------------------------

export async function sendAgentStatusChange(
  chatId: string,
  agentName: string,
  status: "PAUSED" | "LIVE" | "STOPPED",
) {
  const icons: Record<string, string> = {
    PAUSED: "\u{23F8}\u{FE0F}",
    LIVE: "\u{25B6}\u{FE0F}",
    STOPPED: "\u{23F9}\u{FE0F}",
  };

  const labels: Record<string, string> = {
    PAUSED: "Paused",
    LIVE: "Resumed \\(Live\\)",
    STOPPED: "Stopped",
  };

  const msg = [
    `${icons[status]} *Agent ${esc(labels[status])}*`,
    "",
    `\u{1F916} *${esc(agentName)}* is now *${esc(status)}*`,
    "",
    `_${esc(new Date().toUTCString())}_`,
  ].join("\n");

  return sendMessage(chatId, msg, "MarkdownV2");
}

// ---------------------------------------------------------------------------
// Price alert
// ---------------------------------------------------------------------------

export async function sendPriceAlert(
  chatId: string,
  pair: string,
  price: number,
  targetPrice: number,
  direction: "above" | "below",
) {
  const icon = direction === "above" ? "\u{1F4C8}" : "\u{1F4C9}";

  const msg = [
    `${icon} *Price Alert*`,
    "",
    `\`${esc(pair)}\` is now *${direction}* your target\\!`,
    "",
    `\u{1F3AF} *Target:* \\$${esc(targetPrice.toFixed(2))}`,
    `\u{1F4B5} *Current:* \\$${esc(price.toFixed(2))}`,
    "",
    `_${esc(new Date().toUTCString())}_`,
  ].join("\n");

  return sendMessage(chatId, msg, "MarkdownV2");
}
