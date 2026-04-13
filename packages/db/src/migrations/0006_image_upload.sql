-- Phase UX-2: Image Upload Infrastructure
ALTER TABLE "token_hub_cache" ADD COLUMN "logo_source" text;
ALTER TABLE "creator_profiles" ADD COLUMN "banner_url" text;
