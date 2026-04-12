-- Phase 14B: Add launchpad token badge to token_hub_cache
ALTER TABLE "token_hub_cache" ADD COLUMN "is_launchpad_token" boolean NOT NULL DEFAULT false;
