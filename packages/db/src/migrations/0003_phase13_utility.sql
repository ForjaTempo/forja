-- Phase 13: Utility & Engagement — creator profiles, watchlist, alerts

CREATE TABLE IF NOT EXISTS "creator_profiles" (
  "id" serial PRIMARY KEY,
  "wallet_address" text NOT NULL UNIQUE,
  "display_name" text,
  "bio" text,
  "avatar_url" text,
  "website" text,
  "twitter_handle" text,
  "telegram_handle" text,
  "verified" boolean NOT NULL DEFAULT false,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "watchlist" (
  "id" serial PRIMARY KEY,
  "wallet_address" text NOT NULL,
  "token_address" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "watchlist_wallet_token_idx" ON "watchlist" ("wallet_address", "token_address");
CREATE INDEX IF NOT EXISTS "watchlist_wallet_address_idx" ON "watchlist" ("wallet_address");

CREATE TABLE IF NOT EXISTS "alerts" (
  "id" serial PRIMARY KEY,
  "wallet_address" text NOT NULL,
  "type" text NOT NULL,
  "token_address" text NOT NULL,
  "title" text NOT NULL,
  "message" text NOT NULL,
  "metadata" text,
  "is_read" boolean NOT NULL DEFAULT false,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "alerts_wallet_read_idx" ON "alerts" ("wallet_address", "is_read");
CREATE INDEX IF NOT EXISTS "alerts_wallet_created_idx" ON "alerts" ("wallet_address", "created_at");
CREATE INDEX IF NOT EXISTS "alerts_token_address_idx" ON "alerts" ("token_address");
