CREATE TYPE "public"."agent_status" AS ENUM('DRAFT', 'PAPER', 'LIVE', 'PAUSED', 'STOPPED');--> statement-breakpoint
CREATE TYPE "public"."agent_type" AS ENUM('CRYPTO', 'POLYMARKET');--> statement-breakpoint
CREATE TYPE "public"."exchange" AS ENUM('binance', 'bybit');--> statement-breakpoint
CREATE TYPE "public"."order_side" AS ENUM('BUY', 'SELL');--> statement-breakpoint
CREATE TYPE "public"."order_type" AS ENUM('MARKET', 'LIMIT');--> statement-breakpoint
CREATE TYPE "public"."position_side" AS ENUM('LONG', 'SHORT');--> statement-breakpoint
CREATE TYPE "public"."subscription_tier" AS ENUM('FREE', 'PRO', 'ELITE');--> statement-breakpoint
CREATE TYPE "public"."trade_status" AS ENUM('PENDING', 'FILLED', 'PARTIALLY_FILLED', 'CANCELLED', 'FAILED');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text
);
--> statement-breakpoint
CREATE TABLE "agent_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"ended_at" timestamp,
	"status" text DEFAULT 'running' NOT NULL,
	"signals_generated" integer DEFAULT 0 NOT NULL,
	"trades_executed" integer DEFAULT 0 NOT NULL,
	"pnl_usd" real DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"type" "agent_type" NOT NULL,
	"status" "agent_status" DEFAULT 'DRAFT' NOT NULL,
	"exchange" "exchange",
	"pairs" jsonb,
	"strategy" text NOT NULL,
	"strategy_config" jsonb NOT NULL,
	"risk_config" jsonb,
	"exchange_connection_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"action" text NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" text,
	"metadata" jsonb,
	"ip_address" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exchange_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"exchange" "exchange" NOT NULL,
	"label" text,
	"api_key_encrypted" text NOT NULL,
	"api_secret_encrypted" text NOT NULL,
	"api_key_iv" text NOT NULL,
	"api_secret_iv" text NOT NULL,
	"api_key_tag" text NOT NULL,
	"api_secret_tag" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"permissions" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "market_data_candles" (
	"time" timestamp NOT NULL,
	"exchange" "exchange" NOT NULL,
	"pair" text NOT NULL,
	"interval" text NOT NULL,
	"open" real NOT NULL,
	"high" real NOT NULL,
	"low" real NOT NULL,
	"close" real NOT NULL,
	"volume" real NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"is_read" boolean DEFAULT false NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "polymarket_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"condition_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"end_date" timestamp,
	"category" text,
	"outcomes" jsonb,
	"current_odds" jsonb,
	"volume" real,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "polymarket_events_condition_id_unique" UNIQUE("condition_id")
);
--> statement-breakpoint
CREATE TABLE "polymarket_positions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"outcome" text NOT NULL,
	"shares" real NOT NULL,
	"avg_price" real NOT NULL,
	"current_price" real NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "positions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"pair" text NOT NULL,
	"side" "position_side" NOT NULL,
	"entry_price" real NOT NULL,
	"current_price" real NOT NULL,
	"quantity" real NOT NULL,
	"unrealized_pnl" real DEFAULT 0 NOT NULL,
	"stop_loss" real,
	"take_profit" real,
	"is_open" boolean DEFAULT true NOT NULL,
	"opened_at" timestamp DEFAULT now() NOT NULL,
	"closed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_token" text NOT NULL,
	"user_id" uuid NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "sessions_session_token_unique" UNIQUE("session_token")
);
--> statement-breakpoint
CREATE TABLE "signals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"signal_type" text NOT NULL,
	"pair" text NOT NULL,
	"direction" text NOT NULL,
	"confidence" real NOT NULL,
	"indicators" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trades" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"exchange" "exchange" NOT NULL,
	"pair" text NOT NULL,
	"side" "order_side" NOT NULL,
	"type" "order_type" NOT NULL,
	"quantity" real NOT NULL,
	"price" real NOT NULL,
	"fee" real DEFAULT 0,
	"pnl" real,
	"status" "trade_status" DEFAULT 'PENDING' NOT NULL,
	"is_paper" boolean DEFAULT true NOT NULL,
	"external_order_id" text,
	"filled_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text,
	"image" text,
	"totp_secret" text,
	"is_2fa_enabled" boolean DEFAULT false NOT NULL,
	"subscription_tier" "subscription_tier" DEFAULT 'FREE' NOT NULL,
	"email_verified" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_runs" ADD CONSTRAINT "agent_runs_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_exchange_connection_id_exchange_connections_id_fk" FOREIGN KEY ("exchange_connection_id") REFERENCES "public"."exchange_connections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exchange_connections" ADD CONSTRAINT "exchange_connections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "polymarket_positions" ADD CONSTRAINT "polymarket_positions_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "polymarket_positions" ADD CONSTRAINT "polymarket_positions_event_id_polymarket_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."polymarket_events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "positions" ADD CONSTRAINT "positions_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signals" ADD CONSTRAINT "signals_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trades" ADD CONSTRAINT "trades_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trades" ADD CONSTRAINT "trades_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_provider_idx" ON "accounts" USING btree ("provider","provider_account_id");--> statement-breakpoint
CREATE INDEX "agent_runs_agent_idx" ON "agent_runs" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "agents_user_idx" ON "agents" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "agents_status_idx" ON "agents" USING btree ("status");--> statement-breakpoint
CREATE INDEX "audit_log_user_idx" ON "audit_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_log_created_idx" ON "audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "exchange_connections_user_idx" ON "exchange_connections" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "candles_pair_interval_idx" ON "market_data_candles" USING btree ("pair","interval");--> statement-breakpoint
CREATE INDEX "candles_time_idx" ON "market_data_candles" USING btree ("time");--> statement-breakpoint
CREATE INDEX "notifications_user_idx" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notifications_created_idx" ON "notifications" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "polymarket_positions_agent_idx" ON "polymarket_positions" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "positions_agent_idx" ON "positions" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "positions_pair_idx" ON "positions" USING btree ("pair");--> statement-breakpoint
CREATE INDEX "signals_agent_idx" ON "signals" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "signals_created_idx" ON "signals" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "trades_agent_idx" ON "trades" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "trades_user_idx" ON "trades" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "trades_pair_idx" ON "trades" USING btree ("pair");--> statement-breakpoint
CREATE INDEX "trades_created_idx" ON "trades" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");