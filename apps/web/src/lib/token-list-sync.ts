import "server-only";
import { getDb, schema } from "@forja/db";
import { count, desc, eq, sql } from "drizzle-orm";

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

	// 3b. Compute top holder percentage for each FORJA token
	const topHolderPctMap = new Map<string, number>();
	for (const ft of forjaTokens) {
		const addr = ft.address.toLowerCase();
		const totalSupply = ft.initialSupply ? BigInt(ft.initialSupply) : 0n;
		if (totalSupply === 0n) continue;

		const [topHolder] = await db
			.select({ balance: schema.tokenHolderBalances.balance })
			.from(schema.tokenHolderBalances)
			.where(eq(schema.tokenHolderBalances.tokenAddress, addr))
			.orderBy(desc(sql`CAST(${schema.tokenHolderBalances.balance} AS NUMERIC)`))
			.limit(1);

		if (topHolder) {
			const pct = Number((BigInt(topHolder.balance) * 100n) / totalSupply);
			topHolderPctMap.set(addr, pct);
		}
	}

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
			topHolderPct: topHolderPctMap.get(addr) ?? 0,
			logoUri: t.logoURI ?? null,
			isForjaCreated: isForja,
			source: isForja ? "forja" : "token_list",
			lastSyncedAt: now,
			createdAt: forjaToken?.createdAt ?? now,
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
			topHolderPct: topHolderPctMap.get(addr) ?? 0,
			logoUri: null,
			isForjaCreated: true,
			source: "forja",
			lastSyncedAt: now,
			createdAt: ft.createdAt,
		});
	}

	// 4b. Refresh metrics (holder / transfer / topHolderPct) for EVERY row in
	// tokenHubCache — including tip20_factory rows that neither the token list
	// nor the FORJA tokens table surfaces. Without this, external tokens stay
	// at 0/0/0 even after their transfers have been indexed.
	const allCacheRows = await db
		.select({
			address: schema.tokenHubCache.address,
			totalSupply: schema.tokenHubCache.totalSupply,
		})
		.from(schema.tokenHubCache);

	for (const row of allCacheRows) {
		const addr = row.address.toLowerCase();
		if (seenAddresses.has(addr)) continue;

		let pct = 0;
		if (row.totalSupply && BigInt(row.totalSupply) > 0n) {
			const [topHolder] = await db
				.select({ balance: schema.tokenHolderBalances.balance })
				.from(schema.tokenHolderBalances)
				.where(eq(schema.tokenHolderBalances.tokenAddress, addr))
				.orderBy(desc(sql`CAST(${schema.tokenHolderBalances.balance} AS NUMERIC)`))
				.limit(1);
			if (topHolder) {
				pct = Number((BigInt(topHolder.balance) * 100n) / BigInt(row.totalSupply));
			}
		}

		// Update ONLY live metrics — don't touch identity fields.
		await db
			.update(schema.tokenHubCache)
			.set({
				holderCount: holderMap.get(addr) ?? 0,
				transferCount: transferMap.get(addr) ?? 0,
				topHolderPct: pct,
				lastSyncedAt: now,
			})
			.where(eq(schema.tokenHubCache.address, addr));
	}

	if (rows.length === 0) return { synced: allCacheRows.length - seenAddresses.size };

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
					topHolderPct: sql`EXCLUDED.top_holder_pct`,
					logoUri: sql`CASE WHEN token_hub_cache.logo_source = 'user_upload' THEN token_hub_cache.logo_uri ELSE EXCLUDED.logo_uri END`,
					logoSource: sql`CASE WHEN token_hub_cache.logo_source = 'user_upload' THEN token_hub_cache.logo_source WHEN EXCLUDED.logo_uri IS NOT NULL THEN 'token_list' ELSE token_hub_cache.logo_source END`,
					isForjaCreated: sql`EXCLUDED.is_forja_created`,
					// Preserve authoritative sources (forja/launchpad/tip20_factory);
					// only fill in when previous source is NULL or a less-specific value.
					source: sql`CASE WHEN token_hub_cache.source IN ('forja', 'launchpad', 'tip20_factory') THEN token_hub_cache.source ELSE EXCLUDED.source END`,
					lastSyncedAt: sql`EXCLUDED.last_synced_at`,
				},
			});
	}

	return { synced: rows.length };
}
