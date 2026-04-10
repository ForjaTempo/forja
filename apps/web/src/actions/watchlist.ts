"use server";
import { getDb, schema } from "@forja/db";
import { and, count, desc, eq, inArray } from "drizzle-orm";
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
		return tokenAddresses
			.map((a) => tokenMap.get(a))
			.filter((t): t is NonNullable<typeof t> => !!t);
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
