"use server";
import { getDb, schema } from "@forja/db";
import { and, asc, count, desc, eq, gte, ilike, inArray, lt, or, sql } from "drizzle-orm";
import { isAddress } from "viem";
import { LAUNCH_TAG_SET, MAX_LAUNCH_TAGS } from "@/lib/launch-tags";
import { requireAuth } from "@/lib/session";

export type SortOption =
	| "trending"
	| "newest"
	| "oldest"
	| "holders"
	| "transfers"
	| "recent_activity";

export type SourceFilter = "all" | "forja" | "launchpad";
export type StatusFilter = "all" | "new" | "active" | "dormant" | "concentrated";

interface TokenListParams {
	search?: string;
	sort?: SortOption;
	source?: SourceFilter;
	status?: StatusFilter;
	tags?: string[];
	/** @deprecated — migrated to source filter */
	forjaOnly?: boolean;
	offset?: number;
	limit?: number;
}

export type TokenEnriched = typeof schema.tokenHubCache.$inferSelect & {
	creatorDisplayName: string | null;
	holderDelta7d: number | null;
	transfers24h: number;
	currentPrice: string | null;
	trendingScore: number;
	launchDbId: number | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function computeLaunchpadPrice(virtualTokens: string, virtualUsdc: string): string | null {
	try {
		const vt = Number(BigInt(virtualTokens)) / 1_000_000;
		const vu = Number(BigInt(virtualUsdc)) / 1_000_000;
		if (vt <= 0) return null;
		const price = vu / vt;
		return price.toFixed(8);
	} catch {
		return null;
	}
}

// ─── List ───

export async function getTokenList({
	search,
	sort = "newest",
	source = "all",
	status = "all",
	tags,
	forjaOnly,
	offset = 0,
	limit = 20,
}: TokenListParams = {}): Promise<{ tokens: TokenEnriched[]; total: number }> {
	try {
		const db = getDb();
		const conditions = [];

		// Source filter (forjaOnly legacy support)
		const effectiveSource: SourceFilter = source !== "all" ? source : forjaOnly ? "forja" : "all";
		if (effectiveSource === "forja") {
			conditions.push(eq(schema.tokenHubCache.isForjaCreated, true));
		} else if (effectiveSource === "launchpad") {
			conditions.push(eq(schema.tokenHubCache.isLaunchpadToken, true));
		}

		// Status filter
		const now = new Date();
		if (status === "new") {
			const sevenDaysAgo = new Date(now.getTime() - 7 * DAY_MS);
			conditions.push(gte(schema.tokenHubCache.createdAt, sevenDaysAgo));
		} else if (status === "dormant") {
			const thirtyDaysAgo = new Date(now.getTime() - 30 * DAY_MS);
			conditions.push(lt(schema.tokenHubCache.lastSyncedAt, thirtyDaysAgo));
		} else if (status === "concentrated") {
			conditions.push(gte(schema.tokenHubCache.topHolderPct, 40));
		} else if (status === "active") {
			const thirtyDaysAgo = new Date(now.getTime() - 30 * DAY_MS);
			conditions.push(gte(schema.tokenHubCache.lastSyncedAt, thirtyDaysAgo));
			conditions.push(lt(schema.tokenHubCache.topHolderPct, 40));
		}

		// Tags filter
		if (tags && tags.length > 0) {
			const valid = tags.filter((t) => LAUNCH_TAG_SET.has(t));
			if (valid.length > 0) {
				conditions.push(sql`${schema.tokenHubCache.tags} @> ${valid}::text[]`);
			}
		}

		if (search?.trim()) {
			const term = `%${search.trim()}%`;
			const searchCondition = isAddress(search.trim())
				? eq(schema.tokenHubCache.address, search.trim().toLowerCase())
				: or(ilike(schema.tokenHubCache.name, term), ilike(schema.tokenHubCache.symbol, term));
			if (searchCondition) conditions.push(searchCondition);
		}

		const where = conditions.length > 0 ? and(...conditions) : undefined;

		// Build ORDER BY — trending uses a SQL expression so pagination is stable
		const sevenDaysAgo = new Date(now.getTime() - 7 * DAY_MS);
		const oneDayAgo = new Date(now.getTime() - DAY_MS);

		const trendingExpr = sql<number>`(
			COALESCE((
				SELECT ${schema.tokenHubCache.holderCount} - COALESCE((
					SELECT ${schema.tokenDailyStats.holderCount}
					FROM ${schema.tokenDailyStats}
					WHERE ${schema.tokenDailyStats.tokenAddress} = ${schema.tokenHubCache.address}
					AND ${schema.tokenDailyStats.date} <= ${sevenDaysAgo.toISOString()}
					ORDER BY ${schema.tokenDailyStats.date} DESC
					LIMIT 1
				), 0)
			), 0) * 10
			+ COALESCE((
				SELECT COUNT(*)
				FROM ${schema.tokenTransfers}
				WHERE ${schema.tokenTransfers.tokenAddress} = ${schema.tokenHubCache.address}
				AND ${schema.tokenTransfers.createdAt} >= ${oneDayAgo.toISOString()}
			), 0)
		)`;

		const orderBy = (() => {
			switch (sort) {
				case "trending":
					return desc(trendingExpr);
				case "holders":
					return desc(schema.tokenHubCache.holderCount);
				case "transfers":
					return desc(schema.tokenHubCache.transferCount);
				case "recent_activity":
					return desc(schema.tokenHubCache.lastSyncedAt);
				case "oldest":
					return asc(schema.tokenHubCache.createdAt);
				default:
					return desc(schema.tokenHubCache.createdAt);
			}
		})();

		const [tokens, [totalResult]] = await Promise.all([
			db
				.select()
				.from(schema.tokenHubCache)
				.where(where)
				.orderBy(orderBy)
				.offset(offset)
				.limit(limit),
			db.select({ value: count() }).from(schema.tokenHubCache).where(where),
		]);

		if (tokens.length === 0) {
			return { tokens: [], total: totalResult?.value ?? 0 };
		}

		const addresses = tokens.map((t) => t.address);

		// Batch: creator names, 7d holder snapshots, 24h transfer counts, launchpad joins
		const creatorAddresses = [
			...new Set(tokens.map((t) => t.creatorAddress).filter((a): a is string => !!a)),
		];

		const [profiles, holderSnapshots, transferCounts, launchJoins] = await Promise.all([
			creatorAddresses.length > 0
				? db
						.select({
							walletAddress: schema.creatorProfiles.walletAddress,
							displayName: schema.creatorProfiles.displayName,
						})
						.from(schema.creatorProfiles)
						.where(inArray(schema.creatorProfiles.walletAddress, creatorAddresses))
				: Promise.resolve([]),
			db
				.select({
					tokenAddress: schema.tokenDailyStats.tokenAddress,
					holderCount: sql<number>`(
						SELECT ds.holder_count FROM ${schema.tokenDailyStats} ds
						WHERE ds.token_address = ${schema.tokenDailyStats.tokenAddress}
						AND ds.date <= ${sevenDaysAgo.toISOString()}
						ORDER BY ds.date DESC
						LIMIT 1
					)`,
				})
				.from(schema.tokenDailyStats)
				.where(inArray(schema.tokenDailyStats.tokenAddress, addresses))
				.groupBy(schema.tokenDailyStats.tokenAddress),
			db
				.select({
					tokenAddress: schema.tokenTransfers.tokenAddress,
					c: count(),
				})
				.from(schema.tokenTransfers)
				.where(
					and(
						inArray(schema.tokenTransfers.tokenAddress, addresses),
						gte(schema.tokenTransfers.createdAt, oneDayAgo),
					),
				)
				.groupBy(schema.tokenTransfers.tokenAddress),
			db
				.select({
					id: schema.launches.id,
					tokenAddress: schema.launches.tokenAddress,
					virtualTokens: schema.launches.virtualTokens,
					virtualUsdc: schema.launches.virtualUsdc,
					graduated: schema.launches.graduated,
				})
				.from(schema.launches)
				.where(inArray(schema.launches.tokenAddress, addresses)),
		]);

		const creatorNames = new Map<string, string>();
		for (const p of profiles) {
			if (p.displayName) creatorNames.set(p.walletAddress, p.displayName);
		}

		const snapshotMap = new Map<string, number | null>();
		for (const s of holderSnapshots) {
			snapshotMap.set(s.tokenAddress, s.holderCount ?? null);
		}

		const transferMap = new Map<string, number>();
		for (const t of transferCounts) {
			transferMap.set(t.tokenAddress, t.c);
		}

		const launchMap = new Map<string, { id: number; price: string | null; graduated: boolean }>();
		for (const l of launchJoins) {
			launchMap.set(l.tokenAddress, {
				id: l.id,
				price: l.graduated ? null : computeLaunchpadPrice(l.virtualTokens, l.virtualUsdc),
				graduated: l.graduated,
			});
		}

		const enrichedTokens: TokenEnriched[] = tokens.map((t) => {
			const prevHolders = snapshotMap.get(t.address);
			const holderDelta7d = prevHolders != null ? t.holderCount - prevHolders : null;
			const transfers24h = transferMap.get(t.address) ?? 0;
			const trendingScore = (holderDelta7d ?? 0) * 10 + transfers24h;
			const launch = launchMap.get(t.address);
			return {
				...t,
				creatorDisplayName: t.creatorAddress ? (creatorNames.get(t.creatorAddress) ?? null) : null,
				holderDelta7d,
				transfers24h,
				currentPrice: launch?.price ?? null,
				trendingScore,
				launchDbId: launch?.id ?? null,
			};
		});

		return { tokens: enrichedTokens, total: totalResult?.value ?? 0 };
	} catch (err) {
		console.error("[actions] getTokenList failed:", err);
		return { tokens: [], total: 0 };
	}
}

// ─── Trending ───

export async function getTrendingTokens(limitCount = 6): Promise<TokenEnriched[]> {
	const { tokens } = await getTokenList({ sort: "trending", limit: limitCount });
	// Only show tokens with meaningful activity
	return tokens.filter((t) => t.trendingScore > 0);
}

// ─── Hub stats ───

export async function getTokenHubStats() {
	try {
		const db = getDb();
		const [[totalResult], [forjaResult], [holderResult]] = await Promise.all([
			db.select({ value: count() }).from(schema.tokenHubCache),
			db
				.select({ value: count() })
				.from(schema.tokenHubCache)
				.where(eq(schema.tokenHubCache.isForjaCreated, true)),
			db
				.select({ value: sql<number>`COALESCE(SUM(${schema.tokenHubCache.holderCount}), 0)` })
				.from(schema.tokenHubCache),
		]);

		return {
			totalTokens: totalResult?.value ?? 0,
			forjaTokens: forjaResult?.value ?? 0,
			totalHolders: Number(holderResult?.value ?? 0),
		};
	} catch (err) {
		console.error("[actions] getTokenHubStats failed:", err);
		return { totalTokens: 0, forjaTokens: 0, totalHolders: 0 };
	}
}

// ─── Detail ───

export async function getTokenDetail(address: string) {
	if (!address) return null;

	try {
		const db = getDb();
		const [token] = await db
			.select()
			.from(schema.tokenHubCache)
			.where(eq(schema.tokenHubCache.address, address.toLowerCase()))
			.limit(1);

		return token ?? null;
	} catch (err) {
		console.error("[actions] getTokenDetail failed:", err);
		return null;
	}
}

export async function getTokenTransfers(address: string, { offset = 0, limit = 10 } = {}) {
	if (!address) return { transfers: [], total: 0 };

	try {
		const db = getDb();
		const addr = address.toLowerCase();

		const [transfers, [totalResult]] = await Promise.all([
			db
				.select()
				.from(schema.tokenTransfers)
				.where(eq(schema.tokenTransfers.tokenAddress, addr))
				.orderBy(desc(schema.tokenTransfers.blockNumber), desc(schema.tokenTransfers.logIndex))
				.offset(offset)
				.limit(limit),
			db
				.select({ value: count() })
				.from(schema.tokenTransfers)
				.where(eq(schema.tokenTransfers.tokenAddress, addr)),
		]);

		return { transfers, total: totalResult?.value ?? 0 };
	} catch (err) {
		console.error("[actions] getTokenTransfers failed:", err);
		return { transfers: [], total: 0 };
	}
}

export async function getTokenHolderDistribution(address: string) {
	if (!address) return [];

	try {
		const db = getDb();
		const addr = address.toLowerCase();

		const [token] = await db
			.select({ totalSupply: schema.tokenHubCache.totalSupply })
			.from(schema.tokenHubCache)
			.where(eq(schema.tokenHubCache.address, addr))
			.limit(1);

		const totalSupply = token?.totalSupply ? BigInt(token.totalSupply) : 0n;

		const holders = await db
			.select({
				holderAddress: schema.tokenHolderBalances.holderAddress,
				balance: schema.tokenHolderBalances.balance,
			})
			.from(schema.tokenHolderBalances)
			.where(eq(schema.tokenHolderBalances.tokenAddress, addr))
			.orderBy(desc(sql`CAST(${schema.tokenHolderBalances.balance} AS NUMERIC)`))
			.limit(20);

		return holders.map((h) => {
			const balance = BigInt(h.balance);
			const percentage = totalSupply > 0n ? Number((balance * 10000n) / totalSupply) / 100 : 0;
			return {
				holderAddress: h.holderAddress,
				balance: h.balance,
				percentage,
			};
		});
	} catch (err) {
		console.error("[actions] getTokenHolderDistribution failed:", err);
		return [];
	}
}

// ─── Daily stats for chart ───

export interface TokenDailyStatRow {
	date: Date;
	holderCount: number;
	transferCount: number;
	transferVolume: string;
}

export async function getTokenDailyStats(address: string, days = 30): Promise<TokenDailyStatRow[]> {
	if (!address) return [];
	try {
		const db = getDb();
		const since = new Date(Date.now() - days * DAY_MS);
		const rows = await db
			.select({
				date: schema.tokenDailyStats.date,
				holderCount: schema.tokenDailyStats.holderCount,
				transferCount: schema.tokenDailyStats.transferCount,
				transferVolume: schema.tokenDailyStats.transferVolume,
			})
			.from(schema.tokenDailyStats)
			.where(
				and(
					eq(schema.tokenDailyStats.tokenAddress, address.toLowerCase()),
					gte(schema.tokenDailyStats.date, since),
				),
			)
			.orderBy(asc(schema.tokenDailyStats.date));
		return rows;
	} catch (err) {
		console.error("[actions] getTokenDailyStats failed:", err);
		return [];
	}
}

// ─── Set tags (creator-only) ───

export interface SetTokenTagsInput {
	address: string;
	tags: string[];
}

export async function setTokenTags(
	input: SetTokenTagsInput,
): Promise<{ ok: boolean; error?: string }> {
	if (!isAddress(input.address)) return { ok: false, error: "Invalid address" };
	const addr = input.address.toLowerCase();

	const db = getDb();
	const [token] = await db
		.select({ creatorAddress: schema.tokens.creatorAddress })
		.from(schema.tokens)
		.where(eq(schema.tokens.address, addr))
		.limit(1);

	if (!token)
		return { ok: false, error: "Token not found (only FORJA-created tokens can be tagged)" };

	const auth = await requireAuth(token.creatorAddress);
	if (!auth.ok) return auth;

	const cleanTags = Array.from(new Set(input.tags.filter((t) => LAUNCH_TAG_SET.has(t)))).slice(
		0,
		MAX_LAUNCH_TAGS,
	);

	await db
		.update(schema.tokenHubCache)
		.set({ tags: cleanTags })
		.where(eq(schema.tokenHubCache.address, addr));

	return { ok: true };
}

// ─── Creator-related (unchanged) ───

export async function getCreatorProfile(address: string) {
	if (!isAddress(address)) return null;

	try {
		const db = getDb();
		const addr = address.toLowerCase();

		const [
			[tokenResult],
			[multisendResult],
			[lockResult],
			[recipientResult],
			[firstSeenResult],
			[tvlResult],
			[profileRow],
		] = await Promise.all([
			db
				.select({ value: count() })
				.from(schema.tokens)
				.where(eq(schema.tokens.creatorAddress, addr)),
			db
				.select({ value: count() })
				.from(schema.multisends)
				.where(eq(schema.multisends.senderAddress, addr)),
			db.select({ value: count() }).from(schema.locks).where(eq(schema.locks.creatorAddress, addr)),
			db
				.select({ value: sql<number>`COALESCE(SUM(${schema.multisends.recipientCount}), 0)` })
				.from(schema.multisends)
				.where(eq(schema.multisends.senderAddress, addr)),
			db
				.select({ value: sql<Date>`MIN(${schema.tokens.createdAt})` })
				.from(schema.tokens)
				.where(eq(schema.tokens.creatorAddress, addr)),
			db
				.select({
					value: sql<string>`COALESCE(SUM(CAST(${schema.locks.totalAmount} AS NUMERIC) - CAST(${schema.locks.claimedAmount} AS NUMERIC)), 0)`,
				})
				.from(schema.locks)
				.where(and(eq(schema.locks.creatorAddress, addr), eq(schema.locks.revoked, false))),
			db
				.select()
				.from(schema.creatorProfiles)
				.where(eq(schema.creatorProfiles.walletAddress, addr))
				.limit(1),
		]);

		const tokensCreated = tokenResult?.value ?? 0;
		if (tokensCreated === 0) return null;

		return {
			address: addr,
			tokensCreated,
			multisendCount: multisendResult?.value ?? 0,
			lockCount: lockResult?.value ?? 0,
			totalRecipients: Number(recipientResult?.value ?? 0),
			totalValueLocked: tvlResult?.value ?? "0",
			firstSeen: firstSeenResult?.value ?? null,
			displayName: profileRow?.displayName ?? null,
			bio: profileRow?.bio ?? null,
			avatarUrl: profileRow?.avatarUrl ?? null,
			bannerUrl: profileRow?.bannerUrl ?? null,
			website: profileRow?.website ?? null,
			twitterHandle: profileRow?.twitterHandle ?? null,
			telegramHandle: profileRow?.telegramHandle ?? null,
			verified: profileRow?.verified ?? false,
			profileClaimed: !!profileRow,
		};
	} catch (err) {
		console.error("[actions] getCreatorProfile failed:", err);
		return null;
	}
}

export async function getCreatorTokens(address: string) {
	if (!isAddress(address)) return [];

	try {
		const db = getDb();
		return await db
			.select()
			.from(schema.tokenHubCache)
			.where(eq(schema.tokenHubCache.creatorAddress, address.toLowerCase()))
			.orderBy(desc(schema.tokenHubCache.createdAt));
	} catch (err) {
		console.error("[actions] getCreatorTokens failed:", err);
		return [];
	}
}

export async function getCreatorMultisends(address: string) {
	if (!isAddress(address)) return [];

	try {
		const db = getDb();
		return await db
			.select()
			.from(schema.multisends)
			.where(eq(schema.multisends.senderAddress, address.toLowerCase()))
			.orderBy(desc(schema.multisends.blockNumber));
	} catch (err) {
		console.error("[actions] getCreatorMultisends failed:", err);
		return [];
	}
}

export async function getCreatorLocks(address: string) {
	if (!isAddress(address)) return [];

	try {
		const db = getDb();
		return await db
			.select()
			.from(schema.locks)
			.where(eq(schema.locks.creatorAddress, address.toLowerCase()))
			.orderBy(desc(schema.locks.blockNumber));
	} catch (err) {
		console.error("[actions] getCreatorLocks failed:", err);
		return [];
	}
}
