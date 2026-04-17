-- Phase UX-4: Launch Experience Enhancement — social links + tags
ALTER TABLE "launches" ADD COLUMN "website" text;
ALTER TABLE "launches" ADD COLUMN "twitter_handle" text;
ALTER TABLE "launches" ADD COLUMN "telegram_handle" text;
ALTER TABLE "launches" ADD COLUMN "discord_handle" text;
ALTER TABLE "launches" ADD COLUMN "tags" text[] DEFAULT '{}' NOT NULL;
CREATE INDEX "launches_tags_gin_idx" ON "launches" USING GIN ("tags");
