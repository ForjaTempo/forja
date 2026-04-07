-- Phase 11: Add contract_address for V1/V2 locker support
-- Safe rollout: uses IF NOT EXISTS for tables/columns, backfills existing rows with V1 address before enforcing NOT NULL.
-- V1 ForjaLocker mainnet address: 0x6d2F881e84b5D87579d2735510104b76AD728BBa

-- Note: Some tables below were originally created via `drizzle-kit push` in earlier phases,
-- before this migration workflow existed. IF NOT EXISTS guards make this migration idempotent
-- against production databases that already contain those tables.

CREATE TABLE IF NOT EXISTS "token_daily_stats" (
	"id" serial PRIMARY KEY NOT NULL,
	"token_address" text NOT NULL,
	"date" timestamp with time zone NOT NULL,
	"holder_count" integer DEFAULT 0 NOT NULL,
	"transfer_count" integer DEFAULT 0 NOT NULL,
	"transfer_volume" text DEFAULT '0' NOT NULL,
	"unique_senders" integer DEFAULT 0 NOT NULL,
	"unique_receivers" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "token_daily_stats_token_date_idx" UNIQUE("token_address","date")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "token_holder_balances" (
	"id" serial PRIMARY KEY NOT NULL,
	"token_address" text NOT NULL,
	"holder_address" text NOT NULL,
	"balance" text DEFAULT '0' NOT NULL,
	"first_seen_block" integer NOT NULL,
	"last_updated_block" integer NOT NULL,
	CONSTRAINT "token_holder_balances_token_holder_idx" UNIQUE("token_address","holder_address")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "token_hub_cache" (
	"id" serial PRIMARY KEY NOT NULL,
	"address" text NOT NULL,
	"name" text NOT NULL,
	"symbol" text NOT NULL,
	"decimals" integer DEFAULT 6 NOT NULL,
	"total_supply" text,
	"creator_address" text,
	"holder_count" integer DEFAULT 0 NOT NULL,
	"transfer_count" integer DEFAULT 0 NOT NULL,
	"top_holder_pct" integer DEFAULT 0 NOT NULL,
	"logo_uri" text,
	"is_forja_created" boolean DEFAULT false NOT NULL,
	"last_synced_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "token_hub_cache_address_unique" UNIQUE("address")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "token_transfers" (
	"id" serial PRIMARY KEY NOT NULL,
	"token_address" text NOT NULL,
	"from_address" text NOT NULL,
	"to_address" text NOT NULL,
	"amount" text NOT NULL,
	"tx_hash" text NOT NULL,
	"log_index" integer NOT NULL,
	"block_number" integer NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "token_transfers_tx_log_idx" UNIQUE("tx_hash","log_index")
);
--> statement-breakpoint

-- Drop legacy constraints on locks.lock_id and claims.lock_id FK (pre-V2 schema)
ALTER TABLE "locks" DROP CONSTRAINT IF EXISTS "locks_lock_id_unique";--> statement-breakpoint
ALTER TABLE "claims" DROP CONSTRAINT IF EXISTS "claims_lock_id_locks_lock_id_fk";--> statement-breakpoint
DROP INDEX IF EXISTS "claims_lock_id_idx";--> statement-breakpoint

-- Add contract_address columns with V1 address as default so existing rows pass NOT NULL check
ALTER TABLE "locks" ADD COLUMN IF NOT EXISTS "contract_address" text;--> statement-breakpoint
UPDATE "locks" SET "contract_address" = '0x6d2F881e84b5D87579d2735510104b76AD728BBa' WHERE "contract_address" IS NULL;--> statement-breakpoint
ALTER TABLE "locks" ALTER COLUMN "contract_address" SET NOT NULL;--> statement-breakpoint

ALTER TABLE "claims" ADD COLUMN IF NOT EXISTS "contract_address" text;--> statement-breakpoint
UPDATE "claims" SET "contract_address" = '0x6d2F881e84b5D87579d2735510104b76AD728BBa' WHERE "contract_address" IS NULL;--> statement-breakpoint
ALTER TABLE "claims" ALTER COLUMN "contract_address" SET NOT NULL;--> statement-breakpoint

-- Recreate indexes and composite uniqueness for V1/V2 coexistence
CREATE INDEX IF NOT EXISTS "token_daily_stats_token_address_idx" ON "token_daily_stats" USING btree ("token_address");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "token_daily_stats_date_idx" ON "token_daily_stats" USING btree ("date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "token_holder_balances_token_address_idx" ON "token_holder_balances" USING btree ("token_address");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "token_hub_cache_symbol_idx" ON "token_hub_cache" USING btree ("symbol");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "token_hub_cache_creator_address_idx" ON "token_hub_cache" USING btree ("creator_address");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "token_hub_cache_is_forja_created_idx" ON "token_hub_cache" USING btree ("is_forja_created");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "token_transfers_token_address_idx" ON "token_transfers" USING btree ("token_address");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "token_transfers_from_address_idx" ON "token_transfers" USING btree ("from_address");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "token_transfers_to_address_idx" ON "token_transfers" USING btree ("to_address");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "token_transfers_block_number_idx" ON "token_transfers" USING btree ("block_number");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "claims_lock_id_idx" ON "claims" USING btree ("contract_address","lock_id");--> statement-breakpoint

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint WHERE conname = 'locks_contract_lockid_idx'
	) THEN
		ALTER TABLE "locks" ADD CONSTRAINT "locks_contract_lockid_idx" UNIQUE("contract_address","lock_id");
	END IF;
END $$;
