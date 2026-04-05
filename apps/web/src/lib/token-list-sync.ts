import "server-only";
import { getDb, schema } from "@forja/db";
import { count, sql } from "drizzle-orm";

interface TokenListEntry {
	chainId: number;
	address: string;
	name: string;
	symbol: string;
	decimals: number;
	logoURI?: string;
}

interface TokenListResponse {
	tokens: TokenListEntry[];
}

const TOKEN_LIST_URL = "https://tokenlist.tempo.xyz/list/4217";

export async function syncTokenList(): Promise<{ synced: number }> {
	const db = getDb();

	// 1. Fetch token list (keep existing data on failure)
	let tokenListTokens: TokenListEntry[] = [];
	try {
		const res = await fetch(TOKEN_LIST_URL, { signal: AbortSignal.timeout(10_000) });
		if (res.ok) {
			const data = (await res.json()) as TokenListResponse;
			tokenListTokens = data.tokens?.filter((t) => t.chainId === 4217) ?? [];
		}
	} catch (err) {
		console.warn(
			"[token-sync] Failed to fetch token list, continuing with FORJA tokens only:",
			err,
		);
	}

	// 2. Get all FORJA-created tokens
	const forjaTokens = await db.select().from(schema.tokens);
	const forjaAddressSet = new Set(forjaTokens.map((t) => t.address.toLowerCase()));

	// 3. Aggregate holder/transfer counts for FORJA tokens
	const holderCounts = await db
		.select({
			tokenAddress: schema.tokenHolderBalances.tokenAddress,
			value: count(),
		})
		.from(schema.tokenHolderBalances)
		.groupBy(schema.tokenHolderBalances.tokenAddress);

	const transferCounts = await db
		.select({
			tokenAddress: schema.tokenTransfers.tokenAddress,
			value: count(),
		})
		.from(schema.tokenTransfers)
		.groupBy(schema.tokenTransfers.tokenAddress);

	const holderMap = new Map(holderCounts.map((h) => [h.tokenAddress, h.value]));
	const transferMap = new Map(transferCounts.map((t) => [t.tokenAddress, t.value]));

	// 4. Build upsert rows: token list + FORJA tokens not in list
	const now = new Date();
	const rows: (typeof schema.tokenHubCache.$inferInsert)[] = [];
	const seenAddresses = new Set<string>();

	// Token list entries
	for (const t of tokenListTokens) {
		const addr = t.address.toLowerCase();
		seenAddresses.add(addr);
		const isForja = forjaAddressSet.has(addr);
		const forjaToken = isForja
			? forjaTokens.find((ft) => ft.address.toLowerCase() === addr)
			: undefined;

		rows.push({
			address: addr,
			name: t.name,
			symbol: t.symbol,
			decimals: t.decimals,
			totalSupply: forjaToken?.initialSupply ?? null,
			creatorAddress: forjaToken?.creatorAddress?.toLowerCase() ?? null,
			holderCount: holderMap.get(addr) ?? 0,
			transferCount: transferMap.get(addr) ?? 0,
			logoUri: t.logoURI ?? null,
			isForjaCreated: isForja,
			lastSyncedAt: now,
		});
	}

	// FORJA tokens not in token list
	for (const ft of forjaTokens) {
		const addr = ft.address.toLowerCase();
		if (seenAddresses.has(addr)) continue;
		seenAddresses.add(addr);

		rows.push({
			address: addr,
			name: ft.name,
			symbol: ft.symbol,
			decimals: ft.decimals,
			totalSupply: ft.initialSupply,
			creatorAddress: ft.creatorAddress.toLowerCase(),
			holderCount: holderMap.get(addr) ?? 0,
			transferCount: transferMap.get(addr) ?? 0,
			logoUri: null,
			isForjaCreated: true,
			lastSyncedAt: now,
		});
	}

	if (rows.length === 0) return { synced: 0 };

	// 5. Upsert all
	for (const row of rows) {
		await db
			.insert(schema.tokenHubCache)
			.values(row)
			.onConflictDoUpdate({
				target: schema.tokenHubCache.address,
				set: {
					name: sql`EXCLUDED.name`,
					symbol: sql`EXCLUDED.symbol`,
					decimals: sql`EXCLUDED.decimals`,
					totalSupply: sql`EXCLUDED.total_supply`,
					creatorAddress: sql`EXCLUDED.creator_address`,
					holderCount: sql`EXCLUDED.holder_count`,
					transferCount: sql`EXCLUDED.transfer_count`,
					logoUri: sql`EXCLUDED.logo_uri`,
					isForjaCreated: sql`EXCLUDED.is_forja_created`,
					lastSyncedAt: sql`EXCLUDED.last_synced_at`,
				},
			});
	}

	return { synced: rows.length };
}
