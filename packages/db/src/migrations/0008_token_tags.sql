-- Phase UX-5A: Token Hub Visual Evolution — tags on tokenHubCache
ALTER TABLE "token_hub_cache" ADD COLUMN "tags" text[] DEFAULT '{}' NOT NULL;
CREATE INDEX "token_hub_cache_tags_gin_idx" ON "token_hub_cache" USING GIN ("tags");
