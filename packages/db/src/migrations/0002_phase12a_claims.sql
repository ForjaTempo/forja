-- Phase 12A: Merkle Claim Pages — claim_campaigns + claim_proofs tables
-- Safe rollout: uses IF NOT EXISTS so reapplication is a no-op.

CREATE TABLE IF NOT EXISTS "claim_campaigns" (
	"id" serial PRIMARY KEY NOT NULL,
	"contract_address" text NOT NULL,
	"campaign_id" text NOT NULL,
	"slug" text NOT NULL,
	"creator_address" text NOT NULL,
	"token_address" text NOT NULL,
	"merkle_root" text NOT NULL,
	"total_deposited" text NOT NULL,
	"total_claimed" text DEFAULT '0' NOT NULL,
	"recipient_count" integer NOT NULL,
	"claimed_count" integer DEFAULT 0 NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"banner_url" text,
	"start_time" timestamp with time zone NOT NULL,
	"end_time" timestamp with time zone,
	"sweep_enabled" boolean DEFAULT false NOT NULL,
	"swept" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_block" integer NOT NULL,
	"created_tx_hash" text NOT NULL,
	CONSTRAINT "claim_campaigns_contract_cid_idx" UNIQUE("contract_address","campaign_id"),
	CONSTRAINT "claim_campaigns_slug_idx" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "claim_proofs" (
	"id" serial PRIMARY KEY NOT NULL,
	"campaign_db_id" integer NOT NULL,
	"recipient_address" text NOT NULL,
	"amount" text NOT NULL,
	"proof" text NOT NULL,
	"leaf_index" integer NOT NULL,
	"claimed_at" timestamp with time zone,
	"claimed_tx_hash" text,
	CONSTRAINT "claim_proofs_campaign_recipient_idx" UNIQUE("campaign_db_id","recipient_address")
);
--> statement-breakpoint
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint WHERE conname = 'claim_proofs_campaign_db_id_claim_campaigns_id_fk'
	) THEN
		ALTER TABLE "claim_proofs" ADD CONSTRAINT "claim_proofs_campaign_db_id_claim_campaigns_id_fk" FOREIGN KEY ("campaign_db_id") REFERENCES "public"."claim_campaigns"("id") ON DELETE cascade ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "claim_campaigns_creator_idx" ON "claim_campaigns" USING btree ("creator_address");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "claim_campaigns_token_idx" ON "claim_campaigns" USING btree ("token_address");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "claim_proofs_recipient_idx" ON "claim_proofs" USING btree ("recipient_address");
