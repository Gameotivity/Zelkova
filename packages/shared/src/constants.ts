/** Hyperliquid supported perpetual assets */
export const HL_SUPPORTED_ASSETS = [
  "BTC", "ETH", "SOL", "DOGE", "AVAX", "ARB", "OP",
  "SUI", "APT", "INJ", "SEI", "TIA", "LINK", "WIF",
  "PEPE", "MATIC", "NEAR", "FTM", "ATOM", "ADA",
] as const;

export const HL_PAIRS = HL_SUPPORTED_ASSETS.map((a) => `${a}-USD`) as unknown as readonly string[];

export const CANDLE_INTERVALS = ["1m", "5m", "15m", "1h", "4h", "1d"] as const;

export const RISK_LIMITS = {
  MAX_DAILY_LOSS_PCT: 5,
  GLOBAL_PORTFOLIO_STOP_PCT: 15,
  MAX_POSITION_SIZE_PCT: 25,
  MIN_STOP_LOSS_PCT: 0.5,
  MAX_STOP_LOSS_PCT: 50,
  DEFAULT_COOLDOWN_MINUTES: 5,
  MAX_LEVERAGE: 50,
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

export const BUILDER_FEE_BPS = 5; // 0.05% per trade
