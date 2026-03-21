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
export const exchangeEnum = pgEnum("exchange", ["binance", "bybit"]);
export const agentTypeEnum = pgEnum("agent_type", ["CRYPTO", "POLYMARKET"]);
export const agentStatusEnum = pgEnum("agent_status", [
  "DRAFT",
  "PAPER",
  "LIVE",
  "PAUSED",
  "STOPPED",
]);
export const orderSideEnum = pgEnum("order_side", ["BUY", "SELL"]);
export const orderTypeEnum = pgEnum("order_type", ["MARKET", "LIMIT"]);
export const tradeStatusEnum = pgEnum("trade_status", [
  "PENDING",
  "FILLED",
  "PARTIALLY_FILLED",
  "CANCELLED",
  "FAILED",
]);
export const positionSideEnum = pgEnum("position_side", ["LONG", "SHORT"]);
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
    email: text("email").notNull().unique(),
    name: text("name").notNull(),
    passwordHash: text("password_hash"),
    image: text("image"),
    totpSecret: text("totp_secret"),
    is2FAEnabled: boolean("is_2fa_enabled").default(false).notNull(),
    subscriptionTier: subscriptionTierEnum("subscription_tier")
      .default("FREE")
      .notNull(),
    emailVerified: timestamp("email_verified"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("users_email_idx").on(table.email)]
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
      table.providerAccountId
    ),
  ]
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

// Exchange Connections
export const exchangeConnections = pgTable(
  "exchange_connections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    exchange: exchangeEnum("exchange").notNull(),
    label: text("label"),
    apiKeyEncrypted: text("api_key_encrypted").notNull(),
    apiSecretEncrypted: text("api_secret_encrypted").notNull(),
    apiKeyIv: text("api_key_iv").notNull(),
    apiSecretIv: text("api_secret_iv").notNull(),
    apiKeyTag: text("api_key_tag").notNull(),
    apiSecretTag: text("api_secret_tag").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    permissions: jsonb("permissions").$type<string[]>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("exchange_connections_user_idx").on(table.userId)]
);

// Agents
export const agents = pgTable(
  "agents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: agentTypeEnum("type").notNull(),
    status: agentStatusEnum("status").default("DRAFT").notNull(),
    exchange: exchangeEnum("exchange"),
    pairs: jsonb("pairs").$type<string[]>(),
    strategy: text("strategy").notNull(),
    strategyConfig: jsonb("strategy_config").notNull(),
    riskConfig: jsonb("risk_config").$type<{
      stopLossPct: number;
      takeProfitPct?: number;
      maxPositionSizePct: number;
      maxDailyLossPct: number;
      trailingStop?: boolean;
      cooldownMinutes: number;
    }>(),
    exchangeConnectionId: uuid("exchange_connection_id").references(
      () => exchangeConnections.id
    ),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("agents_user_idx").on(table.userId),
    index("agents_status_idx").on(table.status),
  ]
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
  (table) => [index("agent_runs_agent_idx").on(table.agentId)]
);

// Trades
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
    exchange: exchangeEnum("exchange").notNull(),
    pair: text("pair").notNull(),
    side: orderSideEnum("side").notNull(),
    type: orderTypeEnum("type").notNull(),
    quantity: real("quantity").notNull(),
    price: real("price").notNull(),
    fee: real("fee").default(0),
    pnl: real("pnl"),
    status: tradeStatusEnum("status").default("PENDING").notNull(),
    isPaper: boolean("is_paper").default(true).notNull(),
    externalOrderId: text("external_order_id"),
    filledAt: timestamp("filled_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("trades_agent_idx").on(table.agentId),
    index("trades_user_idx").on(table.userId),
    index("trades_pair_idx").on(table.pair),
    index("trades_created_idx").on(table.createdAt),
  ]
);

// Positions
export const positions = pgTable(
  "positions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    pair: text("pair").notNull(),
    side: positionSideEnum("side").notNull(),
    entryPrice: real("entry_price").notNull(),
    currentPrice: real("current_price").notNull(),
    quantity: real("quantity").notNull(),
    unrealizedPnl: real("unrealized_pnl").default(0).notNull(),
    stopLoss: real("stop_loss"),
    takeProfit: real("take_profit"),
    isOpen: boolean("is_open").default(true).notNull(),
    openedAt: timestamp("opened_at").defaultNow().notNull(),
    closedAt: timestamp("closed_at"),
  },
  (table) => [
    index("positions_agent_idx").on(table.agentId),
    index("positions_pair_idx").on(table.pair),
  ]
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
  ]
);

// Market Data Candles (TimescaleDB hypertable)
export const marketDataCandles = pgTable(
  "market_data_candles",
  {
    time: timestamp("time").notNull(),
    exchange: exchangeEnum("exchange").notNull(),
    pair: text("pair").notNull(),
    interval: text("interval").notNull(),
    open: real("open").notNull(),
    high: real("high").notNull(),
    low: real("low").notNull(),
    close: real("close").notNull(),
    volume: real("volume").notNull(),
  },
  (table) => [
    index("candles_pair_interval_idx").on(table.pair, table.interval),
    index("candles_time_idx").on(table.time),
  ]
);

// Polymarket Events
export const polymarketEvents = pgTable("polymarket_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  conditionId: text("condition_id").notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  endDate: timestamp("end_date"),
  category: text("category"),
  outcomes: jsonb("outcomes").$type<
    Array<{ name: string; price: number }>
  >(),
  currentOdds: jsonb("current_odds").$type<Record<string, number>>(),
  volume: real("volume"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Polymarket Positions
export const polymarketPositions = pgTable(
  "polymarket_positions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    eventId: uuid("event_id")
      .notNull()
      .references(() => polymarketEvents.id),
    outcome: text("outcome").notNull(),
    shares: real("shares").notNull(),
    avgPrice: real("avg_price").notNull(),
    currentPrice: real("current_price").notNull(),
    status: text("status").notNull().default("open"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("polymarket_positions_agent_idx").on(table.agentId)]
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
  ]
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
  ]
);
