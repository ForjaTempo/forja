-- Phase Data-1: All Tempo Token Indexing — add source column to tokenHubCache
ALTER TABLE "token_hub_cache" ADD COLUMN "source" text;
CREATE INDEX "token_hub_cache_source_idx" ON "token_hub_cache" ("source");

-- Backfill existing rows based on boolean flags / logo provenance
UPDATE "token_hub_cache"
SET "source" = CASE
  WHEN "is_launchpad_token" = true THEN 'launchpad'
  WHEN "is_forja_created" = true THEN 'forja'
  WHEN "logo_source" = 'token_list' OR "logo_uri" IS NOT NULL THEN 'token_list'
  ELSE 'external'
END
WHERE "source" IS NULL;
