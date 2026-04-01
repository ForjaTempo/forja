CREATE TABLE "claims" (
	"id" serial PRIMARY KEY NOT NULL,
	"lock_id" integer NOT NULL,
	"beneficiary_address" text NOT NULL,
	"amount" text NOT NULL,
	"tx_hash" text NOT NULL,
	"block_number" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "claims_tx_hash_unique" UNIQUE("tx_hash")
);
--> statement-breakpoint
CREATE TABLE "indexer_state" (
	"id" serial PRIMARY KEY NOT NULL,
	"contract_name" text NOT NULL,
	"last_indexed_block" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "indexer_state_contract_name_unique" UNIQUE("contract_name")
);
--> statement-breakpoint
CREATE TABLE "locks" (
	"id" serial PRIMARY KEY NOT NULL,
	"lock_id" integer NOT NULL,
	"token_address" text NOT NULL,
	"creator_address" text NOT NULL,
	"beneficiary_address" text NOT NULL,
	"total_amount" text NOT NULL,
	"claimed_amount" text DEFAULT '0' NOT NULL,
	"start_time" timestamp with time zone NOT NULL,
	"end_time" timestamp with time zone NOT NULL,
	"cliff_duration" integer DEFAULT 0 NOT NULL,
	"vesting_enabled" boolean NOT NULL,
	"revocable" boolean DEFAULT false NOT NULL,
	"revoked" boolean DEFAULT false NOT NULL,
	"tx_hash" text NOT NULL,
	"block_number" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "locks_lock_id_unique" UNIQUE("lock_id")
);
--> statement-breakpoint
CREATE TABLE "multisends" (
	"id" serial PRIMARY KEY NOT NULL,
	"sender_address" text NOT NULL,
	"token_address" text NOT NULL,
	"recipient_count" integer NOT NULL,
	"total_amount" text NOT NULL,
	"tx_hash" text NOT NULL,
	"block_number" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "multisends_tx_hash_unique" UNIQUE("tx_hash")
);
--> statement-breakpoint
CREATE TABLE "tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"address" text NOT NULL,
	"name" text NOT NULL,
	"symbol" text NOT NULL,
	"decimals" integer DEFAULT 6 NOT NULL,
	"initial_supply" text NOT NULL,
	"creator_address" text NOT NULL,
	"tx_hash" text NOT NULL,
	"block_number" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tokens_address_unique" UNIQUE("address"),
	CONSTRAINT "tokens_tx_hash_unique" UNIQUE("tx_hash")
);
--> statement-breakpoint
ALTER TABLE "claims" ADD CONSTRAINT "claims_lock_id_locks_lock_id_fk" FOREIGN KEY ("lock_id") REFERENCES "public"."locks"("lock_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "claims_lock_id_idx" ON "claims" USING btree ("lock_id");--> statement-breakpoint
CREATE INDEX "locks_creator_address_idx" ON "locks" USING btree ("creator_address");--> statement-breakpoint
CREATE INDEX "locks_beneficiary_address_idx" ON "locks" USING btree ("beneficiary_address");--> statement-breakpoint
CREATE INDEX "locks_token_address_idx" ON "locks" USING btree ("token_address");--> statement-breakpoint
CREATE INDEX "multisends_sender_address_idx" ON "multisends" USING btree ("sender_address");--> statement-breakpoint
CREATE INDEX "tokens_creator_address_idx" ON "tokens" USING btree ("creator_address");