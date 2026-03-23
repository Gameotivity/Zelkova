/**
 * XP Engine — Levels, quests, badges, and progression.
 *
 * Production-grade:
 * - Idempotent XP awards (unique constraint on userId + eventType)
 * - Level-up detection with threshold checks
 * - Quest completion tracking
 * - Badge auto-award on milestones
 */

// ═══ Levels ═══════════════════════════════════════

export const LEVELS = [
  { level: 1, xpRequired: 0, title: "Recruit", color: "#94A3B8" },
  { level: 2, xpRequired: 100, title: "Trader", color: "#10B981" },
  { level: 3, xpRequired: 500, title: "Analyst", color: "#00E5FF" },
  { level: 4, xpRequired: 1500, title: "Strategist", color: "#8B5CF6" },
  { level: 5, xpRequired: 3000, title: "Alpha Hunter", color: "#F59E0B" },
  { level: 6, xpRequired: 5000, title: "Market Maker", color: "#F43F5E" },
  { level: 7, xpRequired: 10000, title: "Whale", color: "#00E5FF" },
  { level: 8, xpRequired: 20000, title: "Legend", color: "#FFD700" },
] as const;

export type Level = { level: number; xpRequired: number; title: string; color: string };

export function getLevelForXp(xp: number): Level {
  let current: Level = LEVELS[0];
  for (const lvl of LEVELS) {
    if (xp >= lvl.xpRequired) current = lvl as Level;
    else break;
  }
  return current;
}

export function getNextLevel(currentLevel: number): Level | null {
  const idx = LEVELS.findIndex((l) => l.level === currentLevel);
  return idx >= 0 && idx < LEVELS.length - 1 ? LEVELS[idx + 1] : null;
}

export function getXpProgress(xp: number): { current: number; needed: number; percent: number } {
  const level = getLevelForXp(xp);
  const next = getNextLevel(level.level);
  if (!next) return { current: xp, needed: xp, percent: 100 };
  const progress = xp - level.xpRequired;
  const total = next.xpRequired - level.xpRequired;
  return { current: progress, needed: total, percent: Math.min(100, Math.round((progress / total) * 100)) };
}

// ═══ Quests ═══════════════════════════════════════

export interface Quest {
  id: string;
  title: string;
  description: string;
  xp: number;
  icon: string; // SVG path
  category: "onboarding" | "trading" | "social" | "achievement";
  autoComplete?: boolean; // auto-completes when condition met
}

export const ONBOARDING_QUESTS: Quest[] = [
  {
    id: "WALLET_CONNECTED",
    title: "Connect Wallet",
    description: "Link your wallet to Zelkora",
    xp: 100,
    icon: "M21 12a2.25 2.25 0 0 0-2.25-2.25H15a3 3 0 1 1-6 0H5.25A2.25 2.25 0 0 0 3 12m18 0v6a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 9m18 0V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v3",
    category: "onboarding",
    autoComplete: true,
  },
  {
    id: "NETWORK_SWITCHED",
    title: "Switch to Arbitrum",
    description: "Get on the right network for Hyperliquid",
    xp: 50,
    icon: "M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5",
    category: "onboarding",
    autoComplete: true,
  },
  {
    id: "PROFILE_SET",
    title: "Set Your Identity",
    description: "Choose a username and avatar color",
    xp: 75,
    icon: "M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z",
    category: "onboarding",
  },
  {
    id: "FRIEND_INVITED",
    title: "Invite a Friend",
    description: "Share your referral code and earn 20% of their fees",
    xp: 300,
    icon: "M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z",
    category: "social",
  },
  {
    id: "DASHBOARD_ENTERED",
    title: "Enter the Arena",
    description: "Complete onboarding and explore the dashboard",
    xp: 50,
    icon: "M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25a2.25 2.25 0 0 1-2.25-2.25v-2.25Z",
    category: "onboarding",
  },
];

export const TRADING_QUESTS: Quest[] = [
  { id: "FIRST_BOT", title: "Deploy First Bot", description: "Launch your first trading bot", xp: 200, icon: "M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5", category: "trading" },
  { id: "BUILDER_APPROVED", title: "Approve Builder Fee", description: "Enable live trading on Hyperliquid", xp: 150, icon: "M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6", category: "trading" },
  { id: "FIRST_TRADE", title: "First Trade", description: "Execute your first trade", xp: 500, icon: "M3 7.5 7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5", category: "trading" },
  { id: "FIRST_PROFIT", title: "First Profit", description: "Make your first profitable trade", xp: 1000, icon: "M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22", category: "achievement" },
  { id: "STREAK_5", title: "5 Win Streak", description: "Hit 5 consecutive winning trades", xp: 500, icon: "M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047", category: "achievement" },
];

export const ALL_QUESTS = [...ONBOARDING_QUESTS, ...TRADING_QUESTS];

// ═══ Badges ═══════════════════════════════════════

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  condition?: string; // human-readable condition
}

export const BADGES: Badge[] = [
  { id: "founder", name: "Founder", description: "Completed onboarding", icon: "M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z", color: "#FFD700" },
  { id: "first_blood", name: "First Blood", description: "Executed first trade", icon: "m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z", color: "#F43F5E" },
  { id: "streak_master", name: "Streak Master", description: "5+ win streak", icon: "M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047", color: "#F59E0B" },
  { id: "whale", name: "Whale", description: "$10K+ equity", icon: "M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z", color: "#00E5FF" },
  { id: "referral_king", name: "Referral King", description: "10+ referrals", icon: "M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72", color: "#8B5CF6" },
  { id: "elite_trader", name: "Elite Trader", description: "Reached Level 5", icon: "M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z", color: "#10B981" },
];

// ═══ Avatar Colors ═══════════════════════════════

export const AVATAR_COLORS = [
  { id: "cyan", from: "#00E5FF", to: "#0891B2" },
  { id: "purple", from: "#8B5CF6", to: "#6D28D9" },
  { id: "green", from: "#10B981", to: "#059669" },
  { id: "red", from: "#F43F5E", to: "#E11D48" },
  { id: "orange", from: "#F59E0B", to: "#D97706" },
  { id: "pink", from: "#EC4899", to: "#DB2777" },
  { id: "blue", from: "#3B82F6", to: "#2563EB" },
  { id: "gold", from: "#FFD700", to: "#F59E0B" },
];
