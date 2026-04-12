"use server";
import { getDb, schema } from "@forja/db";
import { eq, sql } from "drizzle-orm";
import { isAddress } from "viem";

export interface TrustSignals {
	isForjaCreated: boolean;
	isLaunchpadToken: boolean;
	profileClaimed: boolean;
	verified: boolean;
	isActive: boolean;
	isDormant: boolean;
	topHolderPct: number;
	isNew: boolean;
}

export async function getTokenTrustSignals(tokenAddress: string): Promise<TrustSignals | null> {
	if (!isAddress(tokenAddress)) return null;

	try {
		const db = getDb();
		const addr = tokenAddress.toLowerCase();

		const [tokenRow] = await db
			.select()
			.from(schema.tokenHubCache)
			.where(eq(schema.tokenHubCache.address, addr))
			.limit(1);

		if (!tokenRow) return null;

		// Check recent activity (transfers in last 7 days)
		const sevenDaysAgo = new Date();
		sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
		const thirtyDaysAgo = new Date();
		thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

		const [recentResult] = await db
			.select({ count: sql<number>`COUNT(*)` })
			.from(schema.tokenDailyStats)
			.where(
				sql`${schema.tokenDailyStats.tokenAddress} = ${addr} AND ${schema.tokenDailyStats.date} >= ${sevenDaysAgo.toISOString()}::timestamptz AND ${schema.tokenDailyStats.transferCount} > 0`,
			);

		const [monthResult] = await db
			.select({ count: sql<number>`COUNT(*)` })
			.from(schema.tokenDailyStats)
			.where(
				sql`${schema.tokenDailyStats.tokenAddress} = ${addr} AND ${schema.tokenDailyStats.date} >= ${thirtyDaysAgo.toISOString()}::timestamptz AND ${schema.tokenDailyStats.transferCount} > 0`,
			);

		const hasRecentActivity = Number(recentResult?.count ?? 0) > 0;
		const hasMonthActivity = Number(monthResult?.count ?? 0) > 0;

		// Check if creator has a claimed profile
		let profileClaimed = false;
		let verified = false;
		if (tokenRow.creatorAddress) {
			const [profileRow] = await db
				.select({
					verified: schema.creatorProfiles.verified,
				})
				.from(schema.creatorProfiles)
				.where(eq(schema.creatorProfiles.walletAddress, tokenRow.creatorAddress))
				.limit(1);

			if (profileRow) {
				profileClaimed = true;
				verified = profileRow.verified;
			}
		}

		// Check if token is new (< 7 days)
		const isNew = tokenRow.createdAt
			? Date.now() - new Date(tokenRow.createdAt).getTime() < 7 * 24 * 60 * 60 * 1000
			: false;

		// Reconcile launchpad badge: if cache flag is false, check launches table
		let isLaunchpadToken = tokenRow.isLaunchpadToken;
		if (!isLaunchpadToken) {
			const [launchRow] = await db
				.select({ id: schema.launches.id })
				.from(schema.launches)
				.where(eq(schema.launches.tokenAddress, addr))
				.limit(1);
			if (launchRow) {
				isLaunchpadToken = true;
				// Async backfill — update cache so future reads are fast
				db.update(schema.tokenHubCache)
					.set({ isLaunchpadToken: true })
					.where(eq(schema.tokenHubCache.address, addr))
					.then(() => {})
					.catch(() => {});
			}
		}

		return {
			isForjaCreated: tokenRow.isForjaCreated,
			isLaunchpadToken,
			profileClaimed,
			verified,
			isActive: hasRecentActivity,
			isDormant: !hasMonthActivity && !isNew,
			topHolderPct: tokenRow.topHolderPct,
			isNew,
		};
	} catch (err) {
		console.error("[actions] getTokenTrustSignals failed:", err);
		return null;
	}
}
