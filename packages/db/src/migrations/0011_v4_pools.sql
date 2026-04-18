-- Phase SWAP — v4 pool discovery index
-- Populated by index-v4-pools.ts from PoolManager.Initialize events so the UI
-- can tell users which tokens have a swappable v4 pool without probing the
-- chain on every TokenPicker open.

CREATE TABLE "v4_pools" (
  "id" serial PRIMARY KEY,
  "pool_id" text NOT NULL,
  "currency0" text NOT NULL,
  "currency1" text NOT NULL,
  "fee" integer NOT NULL,
  "tick_spacing" integer NOT NULL,
  "hooks" text NOT NULL,
  "block_number" integer NOT NULL,
  "tx_hash" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX "v4_pools_pool_id_idx" ON "v4_pools" ("pool_id");
CREATE INDEX "v4_pools_currency0_idx" ON "v4_pools" ("currency0");
CREATE INDEX "v4_pools_currency1_idx" ON "v4_pools" ("currency1");
CREATE INDEX "v4_pools_block_number_idx" ON "v4_pools" ("block_number");
