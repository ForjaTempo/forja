-- Phase SWAP: token swap events emitted by ForjaSwapRouter
CREATE TABLE "swaps" (
  "id" serial PRIMARY KEY,
  "tx_hash" text NOT NULL,
  "log_index" integer NOT NULL,
  "block_number" integer NOT NULL,
  "user_address" text NOT NULL,
  "token_in" text NOT NULL,
  "token_out" text NOT NULL,
  "amount_in" text NOT NULL,        -- BigInt encoded as decimal string
  "amount_out" text NOT NULL,
  "fee_amount" text NOT NULL,       -- protocol fee in tokenIn units
  "created_at" timestamptz NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX "swaps_tx_log_idx" ON "swaps" ("tx_hash", "log_index");
CREATE INDEX "swaps_user_idx" ON "swaps" ("user_address");
CREATE INDEX "swaps_token_in_idx" ON "swaps" ("token_in");
CREATE INDEX "swaps_token_out_idx" ON "swaps" ("token_out");
CREATE INDEX "swaps_created_at_idx" ON "swaps" ("created_at");
CREATE INDEX "swaps_block_number_idx" ON "swaps" ("block_number");
