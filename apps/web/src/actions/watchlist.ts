"use server";
import { getDb, schema } from "@forja/db";
import { and, count, desc, eq, gte, inArray } from "drizzle-orm";
import { isAddress } from "viem";
import { getAuthenticatedAddress, requireAuth } from "@/lib/session";

const MAX_WATCHLIST = 50;

/** Private read — requires auth. */
export async function getWatchlist(walletAddress: string) {
	if (!isAddress(walletAddress)) return [];

	const authed = await getAuthenticatedAddress();
	if (authed !== walletAddress.toLowerCase()) return [];

	try {
		const db = getDb();
		const addr = walletAddress.toLowerCase();

		const entries = await db
			.select({ tokenAddress: schema.watchlist.tokenAddress })
			.from(schema.watchlist)
			.where(eq(schema.watchlist.walletAddress, addr))
			.orderBy(desc(schema.watchlist.createdAt));

		if (entries.length === 0) return [];

		const tokenAddresses = entries.map((e) => e.tokenAddress);

		const tokens = await db
			.select()
			.from(schema.tokenHubCache)
			.where(inArray(schema.tokenHubCache.address, tokenAddresses));

		const tokenMap = new Map(tokens.map((t) => [t.address, t]));
		const orderedTokens = tokenAddresses
			.map((a) => tokenMap.get(a))
			.filter((t): t is NonNullable<typeof t> => !!t);

		// Compute 7d stats for each watched token
		const sevenDaysAgo = new Date();
		sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

		const statsRows = await db
			.select({
				tokenAddress: schema.tokenDailyStats.tokenAddress,
				holderCount: schema.tokenDailyStats.holderCount,
				transferCount: schema.tokenDailyStats.transferCount,
				date: schema.tokenDailyStats.date,
			})
			.from(schema.tokenDailyStats)
			.where(
				and(
					inArray(schema.tokenDailyStats.tokenAddress, tokenAddresses),
					gte(schema.tokenDailyStats.date, sevenDaysAgo),
				),
			)
			.orderBy(schema.tokenDailyStats.date);

		// First and last holder counts + total transfers per token
		const firstHolder = new Map<string, number>();
		const lastHolder = new Map<string, number>();
		const totalTransfers = new Map<string, number>();
		for (const row of statsRows) {
			if (!firstHolder.has(row.tokenAddress)) {
				firstHolder.set(row.tokenAddress, row.holderCount);
			}
			lastHolder.set(row.tokenAddress, row.holderCount);
			totalTransfers.set(
				row.tokenAddress,
				(totalTransfers.get(row.tokenAddress) ?? 0) + row.transferCount,
			);
		}

		return orderedTokens.map((t) => ({
			...t,
			holderDelta: (lastHolder.get(t.address) ?? 0) - (firstHolder.get(t.address) ?? 0),
			transfers7d: totalTransfers.get(t.address) ?? 0,
		}));
	} catch (err) {
		console.error("[actions] getWatchlist failed:", err);
		return [];
	}
}

/** Private read — requires auth. */
export async function getWatchedTokenAddresses(walletAddress: string): Promise<string[]> {
	if (!isAddress(walletAddress)) return [];

	const authed = await getAuthenticatedAddress();
	if (authed !== walletAddress.toLowerCase()) return [];

	try {
		const db = getDb();
		const entries = await db
			.select({ tokenAddress: schema.watchlist.tokenAddress })
			.from(schema.watchlist)
			.where(eq(schema.watchlist.walletAddress, walletAddress.toLowerCase()));

		return entries.map((e) => e.tokenAddress);
	} catch (err) {
		console.error("[actions] getWatchedTokenAddresses failed:", err);
		return [];
	}
}

/** Write — requires auth. */
export async function addToWatchlist(
	walletAddress: string,
	tokenAddress: string,
): Promise<{ ok: boolean; error?: string }> {
	if (!isAddress(walletAddress) || !isAddress(tokenAddress)) {
		return { ok: false, error: "Invalid address" };
	}

	const auth = await requireAuth(walletAddress);
	if (!auth.ok) return auth;

	try {
		const db = getDb();
		const wallet = auth.address;
		const token = tokenAddress.toLowerCase();

		const [result] = await db
			.select({ value: count() })
			.from(schema.watchlist)
			.where(eq(schema.watchlist.walletAddress, wallet));

		if ((result?.value ?? 0) >= MAX_WATCHLIST) {
			return { ok: false, error: `Watchlist limit reached (${MAX_WATCHLIST})` };
		}

		await db
			.insert(schema.watchlist)
			.values({ walletAddress: wallet, tokenAddress: token })
			.onConflictDoNothing();

		return { ok: true };
	} catch (err) {
		console.error("[actions] addToWatchlist failed:", err);
		return { ok: false, error: "Failed to add to watchlist" };
	}
}

/** Write — requires auth. */
export async function removeFromWatchlist(
	walletAddress: string,
	tokenAddress: string,
): Promise<{ ok: boolean; error?: string }> {
	if (!isAddress(walletAddress) || !isAddress(tokenAddress)) {
		return { ok: false, error: "Invalid address" };
	}

	const auth = await requireAuth(walletAddress);
	if (!auth.ok) return auth;

	try {
		const db = getDb();
		await db
			.delete(schema.watchlist)
			.where(
				and(
					eq(schema.watchlist.walletAddress, auth.address),
					eq(schema.watchlist.tokenAddress, tokenAddress.toLowerCase()),
				),
			);

		return { ok: true };
	} catch (err) {
		console.error("[actions] removeFromWatchlist failed:", err);
		return { ok: false, error: "Failed to remove from watchlist" };
	}
}
