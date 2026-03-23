import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  real,
  integer,
  jsonb,
  pgEnum,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// Enums
export const agentStatusEnum = pgEnum("agent_status", [
  "DRAFT",
  "PAPER",
  "LIVE",
  "PAUSED",
  "STOPPED",
]);
export const orderSideEnum = pgEnum("order_side", ["BUY", "SELL"]);
export const orderTypeEnum = pgEnum("order_type", [
  "MARKET",
  "LIMIT",
  "TRIGGER",
]);
export const tradeStatusEnum = pgEnum("trade_status", [
  "PENDING",
  "FILLED",
  "PARTIALLY_FILLED",
  "CANCELLED",
  "FAILED",
]);
export const positionSideEnum = pgEnum("position_side", ["LONG", "SHORT"]);
export const marginModeEnum = pgEnum("margin_mode", ["CROSS", "ISOLATED"]);
export const subscriptionTierEnum = pgEnum("subscription_tier", [
  "FREE",
  "PRO",
  "ELITE",
]);

// Users
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").unique(),
    name: text("name"),
    walletAddress: text("wallet_address").unique(),
    chainId: integer("chain_id"),
    passwordHash: text("password_hash"),
    image: text("image"),
    totpSecret: text("totp_secret"),
    is2FAEnabled: boolean("is_2fa_enabled").default(false).notNull(),
    // Hyperliquid builder fee approval
    builderFeeApproved: boolean("builder_fee_approved")
      .default(false)
      .notNull(),
    builderApprovedAt: timestamp("builder_approved_at"),
    builderMaxFeeBps: integer("builder_max_fee_bps"),
    // Subscription
    subscriptionTier: subscriptionTierEnum("subscription_tier")
      .default("FREE")
      .notNull(),
    emailVerified: timestamp("email_verified"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("users_email_idx").on(table.email),
    index("users_wallet_idx").on(table.walletAddress),
  ],
);

// NextAuth accounts (for OAuth)
export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refreshToken: text("refresh_token"),
    accessToken: text("access_token"),
    expiresAt: integer("expires_at"),
    tokenType: text("token_type"),
    scope: text("scope"),
    idToken: text("id_token"),
    sessionState: text("session_state"),
  },
  (table) => [
    uniqueIndex("accounts_provider_idx").on(
      table.provider,
      table.providerAccountId,
    ),
  ],
);

// Sessions
export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionToken: text("session_token").notNull().unique(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires").notNull(),
});

// Agents (Hyperliquid perps)
export const agents = pgTable(
  "agents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    status: agentStatusEnum("status").default("DRAFT").notNull(),
    // Trading config
    pairs: jsonb("pairs").$type<string[]>(),
    strategy: text("strategy").notNull(),
    strategyConfig: jsonb("strategy_config").notNull(),
    defaultLeverage: integer("default_leverage").default(1).notNull(),
    marginMode: marginModeEnum("margin_mode").default("CROSS").notNull(),
    riskConfig: jsonb("risk_config").$type<{
      stopLossPct: number;
      takeProfitPct?: number;
      maxPositionSizePct: number;
      maxDailyLossPct: number;
      trailingStop?: boolean;
      cooldownMinutes: number;
      maxLeverage: number;
    }>(),
    // HL API wallet for automated execution
    apiWalletAddress: text("api_wallet_address"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("agents_user_idx").on(table.userId),
    index("agents_status_idx").on(table.status),
  ],
);

// Agent Runs
export const agentRuns = pgTable(
  "agent_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    startedAt: timestamp("started_at").defaultNow().notNull(),
    endedAt: timestamp("ended_at"),
    status: text("status").notNull().default("running"),
    signalsGenerated: integer("signals_generated").default(0).notNull(),
    tradesExecuted: integer("trades_executed").default(0).notNull(),
    pnlUsd: real("pnl_usd").default(0).notNull(),
  },
  (table) => [index("agent_runs_agent_idx").on(table.agentId)],
);

// Trades (Hyperliquid perps)
export const trades = pgTable(
  "trades",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    coin: text("coin").notNull(),
    pair: text("pair").notNull(),
    side: orderSideEnum("side").notNull(),
    type: orderTypeEnum("type").notNull(),
    quantity: real("quantity").notNull(),
    price: real("price").notNull(),
    leverage: integer("leverage").default(1).notNull(),
    fee: real("fee").default(0),
    builderFee: real("builder_fee").default(0),
    pnl: real("pnl"),
    status: tradeStatusEnum("status").default("PENDING").notNull(),
    isPaper: boolean("is_paper").default(true).notNull(),
    // Hyperliquid-specific
    hlOrderId: text("hl_order_id"),
    hlCloid: text("hl_cloid"),
    filledAt: timestamp("filled_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("trades_agent_idx").on(table.agentId),
    index("trades_user_idx").on(table.userId),
    index("trades_coin_idx").on(table.coin),
    index("trades_created_idx").on(table.createdAt),
  ],
);

// Positions (Hyperliquid perps)
export const positions = pgTable(
  "positions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    coin: text("coin").notNull(),
    pair: text("pair").notNull(),
    side: positionSideEnum("side").notNull(),
    entryPrice: real("entry_price").notNull(),
    currentPrice: real("current_price").notNull(),
    quantity: real("quantity").notNull(),
    leverage: integer("leverage").default(1).notNull(),
    marginMode: marginModeEnum("margin_mode").default("CROSS").notNull(),
    unrealizedPnl: real("unrealized_pnl").default(0).notNull(),
    liquidationPrice: real("liquidation_price"),
    returnOnEquity: real("return_on_equity").default(0),
    stopLoss: real("stop_loss"),
    takeProfit: real("take_profit"),
    fundingAccrued: real("funding_accrued").default(0),
    isOpen: boolean("is_open").default(true).notNull(),
    openedAt: timestamp("opened_at").defaultNow().notNull(),
    closedAt: timestamp("closed_at"),
  },
  (table) => [
    index("positions_agent_idx").on(table.agentId),
    index("positions_coin_idx").on(table.coin),
  ],
);

// Signals
export const signals = pgTable(
  "signals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    signalType: text("signal_type").notNull(),
    pair: text("pair").notNull(),
    direction: text("direction").notNull(),
    confidence: real("confidence").notNull(),
    indicators: jsonb("indicators"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("signals_agent_idx").on(table.agentId),
    index("signals_created_idx").on(table.createdAt),
  ],
);

// Market Data Candles (TimescaleDB hypertable)
export const marketDataCandles = pgTable(
  "market_data_candles",
  {
    time: timestamp("time").notNull(),
    coin: text("coin").notNull(),
    interval: text("interval").notNull(),
    open: real("open").notNull(),
    high: real("high").notNull(),
    low: real("low").notNull(),
    close: real("close").notNull(),
    volume: real("volume").notNull(),
  },
  (table) => [
    index("candles_coin_interval_idx").on(table.coin, table.interval),
    index("candles_time_idx").on(table.time),
  ],
);

// Copy Trading Leaders
export const copyLeaders = pgTable(
  "copy_leaders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    walletAddress: text("wallet_address").notNull().unique(),
    name: text("name"),
    aiScore: real("ai_score").default(0),
    sharpeRatio: real("sharpe_ratio").default(0),
    winRate: real("win_rate").default(0),
    maxDrawdown: real("max_drawdown").default(0),
    totalPnl: real("total_pnl").default(0),
    pnl30d: real("pnl_30d").default(0),
    avgLeverage: real("avg_leverage").default(1),
    followerCount: integer("follower_count").default(0).notNull(),
    strategyTags: jsonb("strategy_tags").$type<string[]>(),
    isActive: boolean("is_active").default(true).notNull(),
    lastUpdated: timestamp("last_updated").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("copy_leaders_score_idx").on(table.aiScore),
    index("copy_leaders_pnl_idx").on(table.totalPnl),
  ],
);

// Copy Subscriptions
export const copySubscriptions = pgTable(
  "copy_subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    leaderId: uuid("leader_id")
      .notNull()
      .references(() => copyLeaders.id, { onDelete: "cascade" }),
    allocationUsd: real("allocation_usd").notNull(),
    maxLeverage: integer("max_leverage").default(5).notNull(),
    riskScale: real("risk_scale").default(1).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    totalPnl: real("total_pnl").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("copy_subs_user_idx").on(table.userId),
    index("copy_subs_leader_idx").on(table.leaderId),
  ],
);

// AI Chat Sessions
export const aiSessions = pgTable(
  "ai_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    messages: jsonb("messages").$type<
      Array<{ role: string; content: string; timestamp: string }>
    >(),
    context: jsonb("context").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("ai_sessions_user_idx").on(table.userId)],
);

// Notifications
export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    body: text("body"),
    isRead: boolean("is_read").default(false).notNull(),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("notifications_user_idx").on(table.userId),
    index("notifications_created_idx").on(table.createdAt),
  ],
);

// User Profiles (extended info for leaderboard & social)
export const userProfiles = pgTable(
  "user_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" })
      .unique(),
    username: text("username").unique(),
    displayName: text("display_name"),
    bio: text("bio"),
    avatarUrl: text("avatar_url"),
    country: text("country"),
    twitter: text("twitter"),
    telegram: text("telegram"),
    website: text("website"),
    tradingExperience: text("trading_experience"),
    favoriteAssets: jsonb("favorite_assets").$type<string[]>(),
    isPublic: boolean("is_public").default(true).notNull(),
    showOnLeaderboard: boolean("show_on_leaderboard")
      .default(true)
      .notNull(),
    totalPnl: real("total_pnl").default(0).notNull(),
    totalTrades: integer("total_trades").default(0).notNull(),
    winRate: real("win_rate").default(0).notNull(),
    bestStreak: integer("best_streak").default(0).notNull(),
    currentStreak: integer("current_streak").default(0).notNull(),
    rank: integer("rank"),
    badges: jsonb("badges").$type<
      Array<{ id: string; name: string; icon: string; earnedAt: string }>
    >(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("user_profiles_username_idx").on(table.username),
    index("user_profiles_user_idx").on(table.userId),
    index("user_profiles_rank_idx").on(table.rank),
    index("user_profiles_total_pnl_idx").on(table.totalPnl),
  ],
);

// Wallet Nonces (for SIWE auth)
export const walletNonces = pgTable("wallet_nonces", {
  id: uuid("id").primaryKey().defaultRandom(),
  address: text("address").notNull(),
  nonce: text("nonce").notNull(),
  message: text("message").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Fee Ledger — tracks performance fees per user
export const feeLedger = pgTable(
  "fee_ledger",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    agentId: uuid("agent_id").references(() => agents.id),
    // Period tracking
    periodStart: timestamp("period_start").notNull(),
    periodEnd: timestamp("period_end").notNull(),
    // P&L for the period
    grossPnl: real("gross_pnl").notNull().default(0),
    netPnl: real("net_pnl").notNull().default(0), // after fees
    // Fee calculation
    feeTier: text("fee_tier").notNull().default("PRO"), // FREE, PRO, ELITE
    feeRatePct: real("fee_rate_pct").notNull().default(15), // 0, 15, or 10
    feeAmountUsd: real("fee_amount_usd").notNull().default(0),
    // Collection
    builderFeesCollected: real("builder_fees_collected").default(0),
    performanceFeeOwed: real("performance_fee_owed").default(0),
    performanceFeeCollected: real("performance_fee_collected").default(0),
    // Status
    status: text("status").notNull().default("open"), // open, settled, waived
    settledAt: timestamp("settled_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("fee_ledger_user_idx").on(table.userId),
    index("fee_ledger_period_idx").on(table.periodStart),
    index("fee_ledger_status_idx").on(table.status),
  ],
);

// Audit Log
export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id),
    action: text("action").notNull(),
    resourceType: text("resource_type").notNull(),
    resourceId: text("resource_id"),
    metadata: jsonb("metadata"),
    ipAddress: text("ip_address"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("audit_log_user_idx").on(table.userId),
    index("audit_log_created_idx").on(table.createdAt),
  ],
);
