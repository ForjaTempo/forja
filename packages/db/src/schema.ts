import {
	boolean,
	index,
	integer,
	pgTable,
	serial,
	text,
	timestamp,
	unique,
} from "drizzle-orm/pg-core";

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

export const tokenTransfers = pgTable(
	"token_transfers",
	{
		id: serial("id").primaryKey(),
		tokenAddress: text("token_address").notNull(),
		fromAddress: text("from_address").notNull(),
		toAddress: text("to_address").notNull(),
		amount: text("amount").notNull(),
		txHash: text("tx_hash").notNull(),
		logIndex: integer("log_index").notNull(),
		blockNumber: integer("block_number").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
	},
	(table) => [
		unique("token_transfers_tx_log_idx").on(table.txHash, table.logIndex),
		index("token_transfers_token_address_idx").on(table.tokenAddress),
		index("token_transfers_from_address_idx").on(table.fromAddress),
		index("token_transfers_to_address_idx").on(table.toAddress),
		index("token_transfers_block_number_idx").on(table.blockNumber),
	],
);

export const tokenHolderBalances = pgTable(
	"token_holder_balances",
	{
		id: serial("id").primaryKey(),
		tokenAddress: text("token_address").notNull(),
		holderAddress: text("holder_address").notNull(),
		balance: text("balance").notNull().default("0"),
		firstSeenBlock: integer("first_seen_block").notNull(),
		lastUpdatedBlock: integer("last_updated_block").notNull(),
	},
	(table) => [
		unique("token_holder_balances_token_holder_idx").on(table.tokenAddress, table.holderAddress),
		index("token_holder_balances_token_address_idx").on(table.tokenAddress),
	],
);

export const tokenHubCache = pgTable(
	"token_hub_cache",
	{
		id: serial("id").primaryKey(),
		address: text("address").notNull().unique(),
		name: text("name").notNull(),
		symbol: text("symbol").notNull(),
		decimals: integer("decimals").notNull().default(6),
		totalSupply: text("total_supply"),
		creatorAddress: text("creator_address"),
		holderCount: integer("holder_count").notNull().default(0),
		transferCount: integer("transfer_count").notNull().default(0),
		topHolderPct: integer("top_holder_pct").notNull().default(0),
		logoUri: text("logo_uri"),
		isForjaCreated: boolean("is_forja_created").notNull().default(false),
		lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }).notNull().defaultNow(),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [
		index("token_hub_cache_symbol_idx").on(table.symbol),
		index("token_hub_cache_creator_address_idx").on(table.creatorAddress),
		index("token_hub_cache_is_forja_created_idx").on(table.isForjaCreated),
	],
);

export const indexerState = pgTable("indexer_state", {
	id: serial("id").primaryKey(),
	contractName: text("contract_name").notNull().unique(),
	lastIndexedBlock: integer("last_indexed_block").notNull().default(0),
	updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
