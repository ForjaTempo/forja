-- Phase 14: Bonding Curve Launchpad

CREATE TABLE IF NOT EXISTS "launches" (
	"id" serial PRIMARY KEY NOT NULL,
	"contract_address" text NOT NULL,
	"launch_id" text NOT NULL,
	"token_address" text NOT NULL,
	"creator_address" text NOT NULL,
	"name" text NOT NULL,
	"symbol" text NOT NULL,
	"description" text,
	"image_uri" text,
	"virtual_tokens" text NOT NULL,
	"virtual_usdc" text NOT NULL,
	"real_tokens_sold" text NOT NULL DEFAULT '0',
	"real_usdc_raised" text NOT NULL DEFAULT '0',
	"graduated" boolean NOT NULL DEFAULT false,
	"graduated_at" timestamp with time zone,
	"killed" boolean NOT NULL DEFAULT false,
	"failed" boolean NOT NULL DEFAULT false,
	"tx_hash" text NOT NULL,
	"block_number" integer NOT NULL,
	"created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "launch_trades" (
	"id" serial PRIMARY KEY NOT NULL,
	"launch_db_id" integer NOT NULL REFERENCES "launches"("id") ON DELETE CASCADE,
	"trader_address" text NOT NULL,
	"type" text NOT NULL,
	"token_amount" text NOT NULL,
	"usdc_amount" text NOT NULL,
	"fee" text NOT NULL,
	"new_price" text NOT NULL,
	"tx_hash" text NOT NULL,
	"block_number" integer NOT NULL,
	"log_index" integer NOT NULL,
	"created_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- Unique constraints
ALTER TABLE "launches" ADD CONSTRAINT "launches_contract_launch_id_idx" UNIQUE("contract_address", "launch_id");
ALTER TABLE "launch_trades" ADD CONSTRAINT "launch_trades_tx_log_idx" UNIQUE("tx_hash", "log_index");

-- Indexes
CREATE INDEX IF NOT EXISTS "launches_creator_address_idx" ON "launches" ("creator_address");
CREATE INDEX IF NOT EXISTS "launches_token_address_idx" ON "launches" ("token_address");
CREATE INDEX IF NOT EXISTS "launches_graduated_idx" ON "launches" ("graduated");
CREATE INDEX IF NOT EXISTS "launch_trades_launch_db_id_idx" ON "launch_trades" ("launch_db_id");
CREATE INDEX IF NOT EXISTS "launch_trades_trader_address_idx" ON "launch_trades" ("trader_address");
CREATE INDEX IF NOT EXISTS "launch_trades_launch_block_idx" ON "launch_trades" ("launch_db_id", "block_number");
