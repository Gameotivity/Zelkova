export const SUPPORTED_EXCHANGES = ["binance", "bybit"] as const;

export const MAJOR_PAIRS = [
  "BTC/USDT",
  "ETH/USDT",
  "SOL/USDT",
  "BNB/USDT",
  "XRP/USDT",
  "ADA/USDT",
  "DOGE/USDT",
  "AVAX/USDT",
  "DOT/USDT",
  "MATIC/USDT",
  "LINK/USDT",
  "UNI/USDT",
  "ARB/USDT",
] as const;

export const CANDLE_INTERVALS = ["1m", "5m", "15m", "1h", "4h", "1d"] as const;

export const RISK_LIMITS = {
  MAX_DAILY_LOSS_PCT: 5,
  GLOBAL_PORTFOLIO_STOP_PCT: 15,
  MAX_POSITION_SIZE_PCT: 25,
  MIN_STOP_LOSS_PCT: 0.5,
  MAX_STOP_LOSS_PCT: 50,
  DEFAULT_COOLDOWN_MINUTES: 5,
} as const;

export const AGENT_LIMITS = {
  FREE: { maxAgents: 1, liveTrading: false },
  PRO: { maxAgents: 5, liveTrading: true },
  ELITE: { maxAgents: 999, liveTrading: true },
} as const;

export const BRAND = {
  colors: {
    base: "#06080E",
    card: "#0F1629",
    elevated: "#1A2340",
    border: "#1E293B",
    borderSubtle: "#334155",
    textPrimary: "#F8FAFC",
    textBody: "#E2E8F0",
    textMuted: "#94A3B8",
    textDisabled: "#475569",
    accentPrimary: "#00E5FF",
    accentSecondary: "#8B5CF6",
    success: "#10B981",
    danger: "#F43F5E",
    warning: "#F59E0B",
  },
} as const;
