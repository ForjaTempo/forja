import { boolean, index, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const tokens = pgTable(
	"tokens",
	{
		id: serial("id").primaryKey(),
		address: text("address").notNull().unique(),
		name: text("name").notNull(),
		symbol: text("symbol").notNull(),
		decimals: integer("decimals").notNull().default(6),
		initialSupply: text("initial_supply").notNull(),
		creatorAddress: text("creator_address").notNull(),
		txHash: text("tx_hash").notNull().unique(),
		blockNumber: integer("block_number").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [index("tokens_creator_address_idx").on(table.creatorAddress)],
);

export const multisends = pgTable(
	"multisends",
	{
		id: serial("id").primaryKey(),
		senderAddress: text("sender_address").notNull(),
		tokenAddress: text("token_address").notNull(),
		recipientCount: integer("recipient_count").notNull(),
		totalAmount: text("total_amount").notNull(),
		txHash: text("tx_hash").notNull().unique(),
		blockNumber: integer("block_number").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [index("multisends_sender_address_idx").on(table.senderAddress)],
);

export const locks = pgTable(
	"locks",
	{
		id: serial("id").primaryKey(),
		lockId: integer("lock_id").notNull().unique(),
		tokenAddress: text("token_address").notNull(),
		creatorAddress: text("creator_address").notNull(),
		beneficiaryAddress: text("beneficiary_address").notNull(),
		totalAmount: text("total_amount").notNull(),
		claimedAmount: text("claimed_amount").notNull().default("0"),
		startTime: timestamp("start_time", { withTimezone: true }).notNull(),
		endTime: timestamp("end_time", { withTimezone: true }).notNull(),
		cliffDuration: integer("cliff_duration").notNull().default(0),
		vestingEnabled: boolean("vesting_enabled").notNull(),
		revocable: boolean("revocable").notNull().default(false),
		revoked: boolean("revoked").notNull().default(false),
		txHash: text("tx_hash").notNull(),
		blockNumber: integer("block_number").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [
		index("locks_creator_address_idx").on(table.creatorAddress),
		index("locks_beneficiary_address_idx").on(table.beneficiaryAddress),
		index("locks_token_address_idx").on(table.tokenAddress),
	],
);

export const claims = pgTable(
	"claims",
	{
		id: serial("id").primaryKey(),
		lockId: integer("lock_id")
			.notNull()
			.references(() => locks.lockId),
		beneficiaryAddress: text("beneficiary_address").notNull(),
		amount: text("amount").notNull(),
		txHash: text("tx_hash").notNull().unique(),
		blockNumber: integer("block_number").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [index("claims_lock_id_idx").on(table.lockId)],
);

export const indexerState = pgTable("indexer_state", {
	id: serial("id").primaryKey(),
	contractName: text("contract_name").notNull().unique(),
	lastIndexedBlock: integer("last_indexed_block").notNull().default(0),
	updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
