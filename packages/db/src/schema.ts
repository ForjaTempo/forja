import { sql } from "drizzle-orm";
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
		lockId: integer("lock_id").notNull(),
		contractAddress: text("contract_address").notNull(),
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
		unique("locks_contract_lockid_idx").on(table.contractAddress, table.lockId),
		index("locks_creator_address_idx").on(table.creatorAddress),
		index("locks_beneficiary_address_idx").on(table.beneficiaryAddress),
		index("locks_token_address_idx").on(table.tokenAddress),
	],
);

export const claims = pgTable(
	"claims",
	{
		id: serial("id").primaryKey(),
		lockId: integer("lock_id").notNull(),
		contractAddress: text("contract_address").notNull(),
		beneficiaryAddress: text("beneficiary_address").notNull(),
		amount: text("amount").notNull(),
		txHash: text("tx_hash").notNull().unique(),
		blockNumber: integer("block_number").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [index("claims_lock_id_idx").on(table.contractAddress, table.lockId)],
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
		logoSource: text("logo_source"),
		isForjaCreated: boolean("is_forja_created").notNull().default(false),
		isLaunchpadToken: boolean("is_launchpad_token").notNull().default(false),
		/** Provenance label: "forja" | "launchpad" | "token_list" | "tip20_factory" | "external" */
		source: text("source"),
		tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
		lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }).notNull().defaultNow(),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [
		index("token_hub_cache_symbol_idx").on(table.symbol),
		index("token_hub_cache_creator_address_idx").on(table.creatorAddress),
		index("token_hub_cache_is_forja_created_idx").on(table.isForjaCreated),
		index("token_hub_cache_source_idx").on(table.source),
		index("token_hub_cache_tags_gin_idx").using("gin", table.tags),
	],
);

export const tokenDailyStats = pgTable(
	"token_daily_stats",
	{
		id: serial("id").primaryKey(),
		tokenAddress: text("token_address").notNull(),
		date: timestamp("date", { withTimezone: true }).notNull(),
		holderCount: integer("holder_count").notNull().default(0),
		transferCount: integer("transfer_count").notNull().default(0),
		transferVolume: text("transfer_volume").notNull().default("0"),
		uniqueSenders: integer("unique_senders").notNull().default(0),
		uniqueReceivers: integer("unique_receivers").notNull().default(0),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [
		unique("token_daily_stats_token_date_idx").on(table.tokenAddress, table.date),
		index("token_daily_stats_token_address_idx").on(table.tokenAddress),
		index("token_daily_stats_date_idx").on(table.date),
	],
);

export const indexerState = pgTable("indexer_state", {
	id: serial("id").primaryKey(),
	contractName: text("contract_name").notNull().unique(),
	lastIndexedBlock: integer("last_indexed_block").notNull().default(0),
	updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Phase 12A: Merkle Claim Pages — multi-campaign airdrop via ForjaClaimer

export const claimCampaigns = pgTable(
	"claim_campaigns",
	{
		id: serial("id").primaryKey(),
		contractAddress: text("contract_address").notNull(),
		campaignId: text("campaign_id").notNull(), // bigint as string
		slug: text("slug").notNull(),
		creatorAddress: text("creator_address").notNull(),
		tokenAddress: text("token_address").notNull(),
		merkleRoot: text("merkle_root").notNull(),
		totalDeposited: text("total_deposited").notNull(),
		totalClaimed: text("total_claimed").notNull().default("0"),
		recipientCount: integer("recipient_count").notNull(),
		claimedCount: integer("claimed_count").notNull().default(0),
		title: text("title").notNull(),
		description: text("description"),
		bannerUrl: text("banner_url"),
		startTime: timestamp("start_time", { withTimezone: true }).notNull(),
		endTime: timestamp("end_time", { withTimezone: true }),
		sweepEnabled: boolean("sweep_enabled").notNull().default(false),
		swept: boolean("swept").notNull().default(false),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
		createdBlock: integer("created_block").notNull(),
		createdTxHash: text("created_tx_hash").notNull(),
	},
	(table) => [
		unique("claim_campaigns_contract_cid_idx").on(table.contractAddress, table.campaignId),
		unique("claim_campaigns_slug_idx").on(table.slug),
		index("claim_campaigns_creator_idx").on(table.creatorAddress),
		index("claim_campaigns_token_idx").on(table.tokenAddress),
	],
);

// Phase 13: Utility & Engagement

export const creatorProfiles = pgTable("creator_profiles", {
	id: serial("id").primaryKey(),
	walletAddress: text("wallet_address").notNull().unique(),
	displayName: text("display_name"),
	bio: text("bio"),
	avatarUrl: text("avatar_url"),
	bannerUrl: text("banner_url"),
	website: text("website"),
	twitterHandle: text("twitter_handle"),
	telegramHandle: text("telegram_handle"),
	verified: boolean("verified").notNull().default(false),
	createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const watchlist = pgTable(
	"watchlist",
	{
		id: serial("id").primaryKey(),
		walletAddress: text("wallet_address").notNull(),
		tokenAddress: text("token_address").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [
		unique("watchlist_wallet_token_idx").on(table.walletAddress, table.tokenAddress),
		index("watchlist_wallet_address_idx").on(table.walletAddress),
	],
);

export const alerts = pgTable(
	"alerts",
	{
		id: serial("id").primaryKey(),
		walletAddress: text("wallet_address").notNull(),
		type: text("type").notNull(),
		tokenAddress: text("token_address").notNull(),
		title: text("title").notNull(),
		message: text("message").notNull(),
		metadata: text("metadata"),
		isRead: boolean("is_read").notNull().default(false),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [
		index("alerts_wallet_read_idx").on(table.walletAddress, table.isRead),
		index("alerts_wallet_created_idx").on(table.walletAddress, table.createdAt),
		index("alerts_token_address_idx").on(table.tokenAddress),
	],
);

// Phase 14: Bonding Curve Launchpad

export const launches = pgTable(
	"launches",
	{
		id: serial("id").primaryKey(),
		contractAddress: text("contract_address").notNull(),
		launchId: text("launch_id").notNull(),
		tokenAddress: text("token_address").notNull(),
		creatorAddress: text("creator_address").notNull(),
		name: text("name").notNull(),
		symbol: text("symbol").notNull(),
		description: text("description"),
		imageUri: text("image_uri"),
		virtualTokens: text("virtual_tokens").notNull(),
		virtualUsdc: text("virtual_usdc").notNull(),
		realTokensSold: text("real_tokens_sold").notNull().default("0"),
		realUsdcRaised: text("real_usdc_raised").notNull().default("0"),
		graduated: boolean("graduated").notNull().default(false),
		graduatedAt: timestamp("graduated_at", { withTimezone: true }),
		killed: boolean("killed").notNull().default(false),
		failed: boolean("failed").notNull().default(false),
		txHash: text("tx_hash").notNull(),
		blockNumber: integer("block_number").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
		website: text("website"),
		twitterHandle: text("twitter_handle"),
		telegramHandle: text("telegram_handle"),
		discordHandle: text("discord_handle"),
		tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
	},
	(table) => [
		unique("launches_contract_launch_id_idx").on(table.contractAddress, table.launchId),
		index("launches_creator_address_idx").on(table.creatorAddress),
		index("launches_token_address_idx").on(table.tokenAddress),
		index("launches_graduated_idx").on(table.graduated),
		index("launches_tags_gin_idx").using("gin", table.tags),
	],
);

export const launchTrades = pgTable(
	"launch_trades",
	{
		id: serial("id").primaryKey(),
		launchDbId: integer("launch_db_id")
			.notNull()
			.references(() => launches.id, { onDelete: "cascade" }),
		traderAddress: text("trader_address").notNull(),
		type: text("type").notNull(), // "buy" | "sell"
		tokenAmount: text("token_amount").notNull(),
		usdcAmount: text("usdc_amount").notNull(),
		fee: text("fee").notNull(),
		newPrice: text("new_price").notNull(),
		txHash: text("tx_hash").notNull(),
		blockNumber: integer("block_number").notNull(),
		logIndex: integer("log_index").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [
		unique("launch_trades_tx_log_idx").on(table.txHash, table.logIndex),
		index("launch_trades_launch_db_id_idx").on(table.launchDbId),
		index("launch_trades_trader_address_idx").on(table.traderAddress),
		index("launch_trades_launch_block_idx").on(table.launchDbId, table.blockNumber),
	],
);

export const claimProofs = pgTable(
	"claim_proofs",
	{
		id: serial("id").primaryKey(),
		campaignDbId: integer("campaign_db_id")
			.notNull()
			.references(() => claimCampaigns.id, { onDelete: "cascade" }),
		recipientAddress: text("recipient_address").notNull(),
		amount: text("amount").notNull(),
		proof: text("proof").notNull(), // JSON stringified bytes32[]
		leafIndex: integer("leaf_index").notNull(),
		claimedAt: timestamp("claimed_at", { withTimezone: true }),
		claimedTxHash: text("claimed_tx_hash"),
	},
	(table) => [
		unique("claim_proofs_campaign_recipient_idx").on(table.campaignDbId, table.recipientAddress),
		index("claim_proofs_recipient_idx").on(table.recipientAddress),
	],
);

// Phase SWAP: token swaps executed via ForjaSwapRouter

export const swaps = pgTable(
	"swaps",
	{
		id: serial("id").primaryKey(),
		txHash: text("tx_hash").notNull(),
		logIndex: integer("log_index").notNull(),
		blockNumber: integer("block_number").notNull(),
		userAddress: text("user_address").notNull(),
		tokenIn: text("token_in").notNull(),
		tokenOut: text("token_out").notNull(),
		amountIn: text("amount_in").notNull(),
		amountOut: text("amount_out").notNull(),
		feeAmount: text("fee_amount").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [
		unique("swaps_tx_log_idx").on(table.txHash, table.logIndex),
		index("swaps_user_idx").on(table.userAddress),
		index("swaps_token_in_idx").on(table.tokenIn),
		index("swaps_token_out_idx").on(table.tokenOut),
		index("swaps_created_at_idx").on(table.createdAt),
		index("swaps_block_number_idx").on(table.blockNumber),
	],
);
