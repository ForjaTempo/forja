"use server";

import { getDb, schema } from "@forja/db";
import { and, count, desc, eq, gte, ilike, inArray, or, sql } from "drizzle-orm";
import { isAddress } from "viem";

// ─── Types ───

type LaunchSortOption = "newest" | "volume" | "progress" | "graduated";

interface LaunchListParams {
	search?: string;
	sort?: LaunchSortOption;
	status?: "active" | "graduated" | "failed";
	creator?: string;
	offset?: number;
	limit?: number;
}

export type LaunchRow = typeof schema.launches.$inferSelect;
export type LaunchTradeRow = typeof schema.launchTrades.$inferSelect;

export interface LaunchListItem extends LaunchRow {
	tradeCount: number;
	volume24h: string;
	creatorDisplayName: string | null;
}

export interface LaunchDetail extends LaunchRow {
	tradeCount: number;
	totalVolume: string;
	uniqueTraders: number;
	holderCount: number;
	creatorDisplayName: string | null;
}

export interface LaunchStatsData {
	totalLaunches: number;
	activeLaunches: number;
	graduatedLaunches: number;
	totalVolume: string;
}

// ─── List ───

export async function getLaunches({
	search,
	sort = "newest",
	status,
	creator,
	offset = 0,
	limit = 20,
}: LaunchListParams = {}): Promise<{ launches: LaunchListItem[]; total: number }> {
	try {
		const db = getDb();
		const conditions = [];

		if (status === "active") {
			conditions.push(eq(schema.launches.graduated, false));
			conditions.push(eq(schema.launches.killed, false));
			conditions.push(eq(schema.launches.failed, false));
		} else if (status === "graduated") {
			conditions.push(eq(schema.launches.graduated, true));
		} else if (status === "failed") {
			conditions.push(or(eq(schema.launches.killed, true), eq(schema.launches.failed, true)));
		}

		if (creator && isAddress(creator)) {
			conditions.push(eq(schema.launches.creatorAddress, creator.toLowerCase()));
		}

		if (search?.trim()) {
			const term = `%${search.trim()}%`;
			const searchCondition = isAddress(search.trim())
				? eq(schema.launches.tokenAddress, search.trim().toLowerCase())
				: or(ilike(schema.launches.name, term), ilike(schema.launches.symbol, term));
			if (searchCondition) conditions.push(searchCondition);
		}

		const where = conditions.length > 0 ? and(...conditions) : undefined;

		const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

		// Volume sort requires a subquery-based ORDER BY so pagination works globally
		const volumeSubquery = sql`COALESCE((
			SELECT SUM(CAST(${schema.launchTrades.usdcAmount} AS NUMERIC))
			FROM ${schema.launchTrades}
			WHERE ${schema.launchTrades.launchDbId} = ${schema.launches.id}
			AND ${schema.launchTrades.createdAt} >= ${twentyFourHoursAgo.toISOString()}
		), 0)`;

		const orderBy = (() => {
			switch (sort) {
				case "graduated":
					return desc(schema.launches.graduatedAt);
				case "progress":
					return desc(sql`CAST(${schema.launches.realUsdcRaised} AS NUMERIC)`);
				case "volume":
					return desc(volumeSubquery);
				default:
					return desc(schema.launches.createdAt);
			}
		})();

		const [rows, [totalResult]] = await Promise.all([
			db.select().from(schema.launches).where(where).orderBy(orderBy).offset(offset).limit(limit),
			db.select({ value: count() }).from(schema.launches).where(where),
		]);

		if (rows.length === 0) {
			return { launches: [], total: 0 };
		}

		const launchDbIds = rows.map((r) => r.id);

		// Batch: trade counts + 24h volume
		const [tradeCounts, volumes] = await Promise.all([
			db
				.select({
					launchDbId: schema.launchTrades.launchDbId,
					tradeCount: count(),
				})
				.from(schema.launchTrades)
				.where(inArray(schema.launchTrades.launchDbId, launchDbIds))
				.groupBy(schema.launchTrades.launchDbId),
			db
				.select({
					launchDbId: schema.launchTrades.launchDbId,
					volume: sql<string>`COALESCE(SUM(CAST(${schema.launchTrades.usdcAmount} AS NUMERIC)), 0)`,
				})
				.from(schema.launchTrades)
				.where(
					and(
						inArray(schema.launchTrades.launchDbId, launchDbIds),
						gte(schema.launchTrades.createdAt, twentyFourHoursAgo),
					),
				)
				.groupBy(schema.launchTrades.launchDbId),
		]);

		const tradeMap = new Map(tradeCounts.map((t) => [t.launchDbId, t.tradeCount]));
		const volumeMap = new Map(volumes.map((v) => [v.launchDbId, v.volume]));

		// Batch: creator display names
		const creatorAddresses = [...new Set(rows.map((r) => r.creatorAddress))];
		const creatorNames: Record<string, string> = {};
		if (creatorAddresses.length > 0) {
			const profiles = await db
				.select({
					walletAddress: schema.creatorProfiles.walletAddress,
					displayName: schema.creatorProfiles.displayName,
				})
				.from(schema.creatorProfiles)
				.where(inArray(schema.creatorProfiles.walletAddress, creatorAddresses));
			for (const p of profiles) {
				if (p.displayName) creatorNames[p.walletAddress] = p.displayName;
			}
		}

		const launches: LaunchListItem[] = rows.map((r) => ({
			...r,
			tradeCount: tradeMap.get(r.id) ?? 0,
			volume24h: volumeMap.get(r.id) ?? "0",
			creatorDisplayName: creatorNames[r.creatorAddress] ?? null,
		}));

		return { launches, total: totalResult?.value ?? 0 };
	} catch (err) {
		console.error("[launches] getLaunches failed:", err);
		return { launches: [], total: 0 };
	}
}

// ─── Detail ───

export async function getLaunchDetail(launchDbId: number): Promise<LaunchDetail | null> {
	if (!Number.isFinite(launchDbId) || launchDbId <= 0) return null;

	try {
		const db = getDb();

		const [[launch], [stats], [profileRow], [holderRow]] = await Promise.all([
			db.select().from(schema.launches).where(eq(schema.launches.id, launchDbId)).limit(1),
			db
				.select({
					tradeCount: count(),
					totalVolume: sql<string>`COALESCE(SUM(CAST(${schema.launchTrades.usdcAmount} AS NUMERIC)), 0)`,
					uniqueTraders: sql<number>`COUNT(DISTINCT ${schema.launchTrades.traderAddress})`,
				})
				.from(schema.launchTrades)
				.where(eq(schema.launchTrades.launchDbId, launchDbId)),
			db
				.select()
				.from(schema.creatorProfiles)
				.where(
					eq(
						schema.creatorProfiles.walletAddress,
						sql`(SELECT ${schema.launches.creatorAddress} FROM ${schema.launches} WHERE ${schema.launches.id} = ${launchDbId} LIMIT 1)`,
					),
				)
				.limit(1),
			db
				.select({ holderCount: schema.tokenHubCache.holderCount })
				.from(schema.tokenHubCache)
				.where(
					eq(
						schema.tokenHubCache.address,
						sql`(SELECT ${schema.launches.tokenAddress} FROM ${schema.launches} WHERE ${schema.launches.id} = ${launchDbId} LIMIT 1)`,
					),
				)
				.limit(1),
		]);

		if (!launch) return null;

		return {
			...launch,
			tradeCount: stats?.tradeCount ?? 0,
			totalVolume: stats?.totalVolume ?? "0",
			uniqueTraders: Number(stats?.uniqueTraders ?? 0),
			holderCount: holderRow?.holderCount ?? 0,
			creatorDisplayName: profileRow?.displayName ?? null,
		};
	} catch (err) {
		console.error("[launches] getLaunchDetail failed:", err);
		return null;
	}
}

// ─── Launch by token address (for linking from token hub) ───

export async function getLaunchByToken(tokenAddress: string): Promise<LaunchRow | null> {
	if (!tokenAddress) return null;

	try {
		const db = getDb();
		const [row] = await db
			.select()
			.from(schema.launches)
			.where(eq(schema.launches.tokenAddress, tokenAddress.toLowerCase()))
			.limit(1);
		return row ?? null;
	} catch (err) {
		console.error("[launches] getLaunchByToken failed:", err);
		return null;
	}
}

// ─── Trades ───

export async function getLaunchTrades(
	launchDbId: number,
	{ offset = 0, limit = 20 } = {},
): Promise<{ trades: LaunchTradeRow[]; total: number }> {
	if (!Number.isFinite(launchDbId) || launchDbId <= 0) {
		return { trades: [], total: 0 };
	}

	try {
		const db = getDb();

		const [trades, [totalResult]] = await Promise.all([
			db
				.select()
				.from(schema.launchTrades)
				.where(eq(schema.launchTrades.launchDbId, launchDbId))
				.orderBy(desc(schema.launchTrades.blockNumber), desc(schema.launchTrades.logIndex))
				.offset(offset)
				.limit(limit),
			db
				.select({ value: count() })
				.from(schema.launchTrades)
				.where(eq(schema.launchTrades.launchDbId, launchDbId)),
		]);

		return { trades, total: totalResult?.value ?? 0 };
	} catch (err) {
		console.error("[launches] getLaunchTrades failed:", err);
		return { trades: [], total: 0 };
	}
}

// ─── Stats ───

export async function getLaunchStats(): Promise<LaunchStatsData> {
	try {
		const db = getDb();

		const [[totalResult], [activeResult], [gradResult], [volumeResult]] = await Promise.all([
			db.select({ value: count() }).from(schema.launches),
			db
				.select({ value: count() })
				.from(schema.launches)
				.where(
					and(
						eq(schema.launches.graduated, false),
						eq(schema.launches.killed, false),
						eq(schema.launches.failed, false),
					),
				),
			db
				.select({ value: count() })
				.from(schema.launches)
				.where(eq(schema.launches.graduated, true)),
			db
				.select({
					value: sql<string>`COALESCE(SUM(CAST(${schema.launchTrades.usdcAmount} AS NUMERIC)), 0)`,
				})
				.from(schema.launchTrades),
		]);

		return {
			totalLaunches: totalResult?.value ?? 0,
			activeLaunches: activeResult?.value ?? 0,
			graduatedLaunches: gradResult?.value ?? 0,
			totalVolume: volumeResult?.value ?? "0",
		};
	} catch (err) {
		console.error("[launches] getLaunchStats failed:", err);
		return { totalLaunches: 0, activeLaunches: 0, graduatedLaunches: 0, totalVolume: "0" };
	}
}

// ─── My Launches (dashboard) ───

export async function getLaunchesByCreator(creatorAddress: string): Promise<LaunchListItem[]> {
	if (!isAddress(creatorAddress)) return [];

	try {
		const db = getDb();
		const addr = creatorAddress.toLowerCase();

		const rows = await db
			.select()
			.from(schema.launches)
			.where(eq(schema.launches.creatorAddress, addr))
			.orderBy(desc(schema.launches.createdAt));

		if (rows.length === 0) return [];

		const launchDbIds = rows.map((r) => r.id);
		const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

		const [tradeCounts, volumes] = await Promise.all([
			db
				.select({
					launchDbId: schema.launchTrades.launchDbId,
					tradeCount: count(),
				})
				.from(schema.launchTrades)
				.where(inArray(schema.launchTrades.launchDbId, launchDbIds))
				.groupBy(schema.launchTrades.launchDbId),
			db
				.select({
					launchDbId: schema.launchTrades.launchDbId,
					volume: sql<string>`COALESCE(SUM(CAST(${schema.launchTrades.usdcAmount} AS NUMERIC)), 0)`,
				})
				.from(schema.launchTrades)
				.where(
					and(
						inArray(schema.launchTrades.launchDbId, launchDbIds),
						gte(schema.launchTrades.createdAt, twentyFourHoursAgo),
					),
				)
				.groupBy(schema.launchTrades.launchDbId),
		]);

		const tradeMap = new Map(tradeCounts.map((t) => [t.launchDbId, t.tradeCount]));
		const volumeMap = new Map(volumes.map((v) => [v.launchDbId, v.volume]));

		return rows.map((r) => ({
			...r,
			tradeCount: tradeMap.get(r.id) ?? 0,
			volume24h: volumeMap.get(r.id) ?? "0",
			creatorDisplayName: null, // own launches, name not needed
		}));
	} catch (err) {
		console.error("[launches] getLaunchesByCreator failed:", err);
		return [];
	}
}

// ─── User position in a launch ───

export interface UserLaunchPosition {
	tokenAmount: string;
	totalUsdcSpent: string;
	totalUsdcReceived: string;
	tradeCount: number;
}

export async function getUserLaunchPosition(
	launchDbId: number,
	wallet: string,
): Promise<UserLaunchPosition | null> {
	if (!Number.isFinite(launchDbId) || launchDbId <= 0) return null;
	if (!isAddress(wallet)) return null;

	try {
		const db = getDb();
		const addr = wallet.toLowerCase();

		const [buys, sells] = await Promise.all([
			db
				.select({
					totalTokens: sql<string>`COALESCE(SUM(CAST(${schema.launchTrades.tokenAmount} AS NUMERIC)), 0)`,
					totalUsdc: sql<string>`COALESCE(SUM(CAST(${schema.launchTrades.usdcAmount} AS NUMERIC)), 0)`,
					cnt: count(),
				})
				.from(schema.launchTrades)
				.where(
					and(
						eq(schema.launchTrades.launchDbId, launchDbId),
						eq(schema.launchTrades.traderAddress, addr),
						eq(schema.launchTrades.type, "buy"),
					),
				),
			db
				.select({
					totalTokens: sql<string>`COALESCE(SUM(CAST(${schema.launchTrades.tokenAmount} AS NUMERIC)), 0)`,
					totalUsdc: sql<string>`COALESCE(SUM(CAST(${schema.launchTrades.usdcAmount} AS NUMERIC)), 0)`,
					cnt: count(),
				})
				.from(schema.launchTrades)
				.where(
					and(
						eq(schema.launchTrades.launchDbId, launchDbId),
						eq(schema.launchTrades.traderAddress, addr),
						eq(schema.launchTrades.type, "sell"),
					),
				),
		]);

		const buyTokens = BigInt(buys[0]?.totalTokens ?? "0");
		const sellTokens = BigInt(sells[0]?.totalTokens ?? "0");
		const tokenAmount = (buyTokens - sellTokens).toString();
		const totalUsdcSpent = buys[0]?.totalUsdc ?? "0";
		const totalUsdcReceived = sells[0]?.totalUsdc ?? "0";
		const tradeCount = (buys[0]?.cnt ?? 0) + (sells[0]?.cnt ?? 0);

		if (tradeCount === 0) return null;

		return { tokenAmount, totalUsdcSpent, totalUsdcReceived, tradeCount };
	} catch (err) {
		console.error("[launches] getUserLaunchPosition failed:", err);
		return null;
	}
}

// ─── On-chain launchId → DB id lookup (for post-create navigation) ───

export async function getLaunchDbId(
	onChainLaunchId: string,
	contractAddress: string,
): Promise<number | null> {
	try {
		const db = getDb();
		const [row] = await db
			.select({ id: schema.launches.id })
			.from(schema.launches)
			.where(
				and(
					eq(schema.launches.contractAddress, contractAddress.toLowerCase()),
					eq(schema.launches.launchId, onChainLaunchId),
				),
			)
			.limit(1);
		return row?.id ?? null;
	} catch (err) {
		console.error("[launches] getLaunchDbId failed:", err);
		return null;
	}
}
