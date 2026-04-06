"use server";
import { getDb, schema } from "@forja/db";
import { and, asc, count, desc, eq, gt, gte, sql } from "drizzle-orm";
import { isAddress } from "viem";
import { FEES } from "@/lib/constants";

export interface DashboardOverviewData {
	tokensCreated: number;
	totalRecipients: number;
	totalValueLocked: string;
	totalFeesPaid: number;
	multisendCount: number;
	lockCount: number;
}

/**
 * Get dashboard overview stats for a wallet address.
 * Works for any address that has created tokens, sent multisends, or created locks.
 * Fee calculation uses current contract fee rates — accurate as long as fees haven't changed.
 */
export async function getDashboardOverview(address: string): Promise<DashboardOverviewData | null> {
	if (!isAddress(address)) return null;

	try {
		const db = getDb();
		const addr = address.toLowerCase();

		const [[tokenResult], [multisendResult], [lockResult], [recipientResult], [tvlResult]] =
			await Promise.all([
				db
					.select({ value: count() })
					.from(schema.tokens)
					.where(eq(schema.tokens.creatorAddress, addr)),
				db
					.select({ value: count() })
					.from(schema.multisends)
					.where(eq(schema.multisends.senderAddress, addr)),
				db
					.select({ value: count() })
					.from(schema.locks)
					.where(eq(schema.locks.creatorAddress, addr)),
				db
					.select({
						value: sql<number>`COALESCE(SUM(${schema.multisends.recipientCount}), 0)`,
					})
					.from(schema.multisends)
					.where(eq(schema.multisends.senderAddress, addr)),
				db
					.select({
						value: sql<string>`COALESCE(SUM(CAST(${schema.locks.totalAmount} AS NUMERIC) - CAST(${schema.locks.claimedAmount} AS NUMERIC)), 0)`,
					})
					.from(schema.locks)
					.where(eq(schema.locks.creatorAddress, addr)),
			]);

		const tokensCreated = tokenResult?.value ?? 0;
		const multisendCount = multisendResult?.value ?? 0;
		const lockCount = lockResult?.value ?? 0;

		// No activity at all
		if (tokensCreated === 0 && multisendCount === 0 && lockCount === 0) {
			return null;
		}

		// Fee calculation uses current contract rates.
		// FORJA contract fees are immutable, so this is accurate for all historical actions.
		const feesPaid =
			tokensCreated * FEES.tokenCreate +
			multisendCount * FEES.multisend +
			lockCount * FEES.tokenLock;

		return {
			tokensCreated,
			totalRecipients: Number(recipientResult?.value ?? 0),
			totalValueLocked: tvlResult?.value ?? "0",
			totalFeesPaid: feesPaid,
			multisendCount,
			lockCount,
		};
	} catch (err) {
		console.error("[dashboard] getDashboardOverview failed:", err);
		return null;
	}
}

export async function getTokenAnalytics(tokenAddress: string, range: "7d" | "30d" | "90d" | "all") {
	try {
		const db = getDb();
		const addr = tokenAddress.toLowerCase();

		if (range === "all") {
			return await db
				.select()
				.from(schema.tokenDailyStats)
				.where(eq(schema.tokenDailyStats.tokenAddress, addr))
				.orderBy(asc(schema.tokenDailyStats.date));
		}

		const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
		const cutoff = new Date();
		cutoff.setDate(cutoff.getDate() - days);
		cutoff.setUTCHours(0, 0, 0, 0);

		return await db
			.select()
			.from(schema.tokenDailyStats)
			.where(
				and(
					eq(schema.tokenDailyStats.tokenAddress, addr),
					gte(schema.tokenDailyStats.date, cutoff),
				),
			)
			.orderBy(asc(schema.tokenDailyStats.date));
	} catch (err) {
		console.error("[dashboard] getTokenAnalytics failed:", err);
		return [];
	}
}

export interface TokenWithStats {
	address: string;
	name: string;
	symbol: string;
	decimals: number;
	totalSupply: string | null;
	holderCount: number;
	transferCount: number;
	logoUri: string | null;
	recentTransfers: number;
	holderDelta: number;
}

export async function getCreatorTokensWithStats(creatorAddress: string): Promise<TokenWithStats[]> {
	if (!isAddress(creatorAddress)) return [];

	try {
		const db = getDb();
		const addr = creatorAddress.toLowerCase();

		const sevenDaysAgo = new Date();
		sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
		sevenDaysAgo.setUTCHours(0, 0, 0, 0);

		const tokens = await db
			.select()
			.from(schema.tokenHubCache)
			.where(eq(schema.tokenHubCache.creatorAddress, addr))
			.orderBy(desc(schema.tokenHubCache.createdAt));

		if (tokens.length === 0) return [];

		const result: TokenWithStats[] = [];

		for (const token of tokens) {
			// Get 7d stats
			const [stats] = await db
				.select({
					recentTransfers: sql<number>`COALESCE(SUM(${schema.tokenDailyStats.transferCount}), 0)`,
					oldestHolderCount: sql<number>`(
						SELECT ${schema.tokenDailyStats.holderCount}
						FROM ${schema.tokenDailyStats}
						WHERE ${schema.tokenDailyStats.tokenAddress} = ${token.address}
						AND ${schema.tokenDailyStats.date} >= ${sevenDaysAgo}
						ORDER BY ${schema.tokenDailyStats.date} ASC
						LIMIT 1
					)`,
					latestHolderCount: sql<number>`(
						SELECT ${schema.tokenDailyStats.holderCount}
						FROM ${schema.tokenDailyStats}
						WHERE ${schema.tokenDailyStats.tokenAddress} = ${token.address}
						ORDER BY ${schema.tokenDailyStats.date} DESC
						LIMIT 1
					)`,
				})
				.from(schema.tokenDailyStats)
				.where(
					and(
						eq(schema.tokenDailyStats.tokenAddress, token.address),
						gte(schema.tokenDailyStats.date, sevenDaysAgo),
					),
				);

			const recentTransfers = Number(stats?.recentTransfers ?? 0);
			const oldest = Number(stats?.oldestHolderCount ?? 0);
			const latest = Number(stats?.latestHolderCount ?? 0);
			const holderDelta = latest - oldest;

			result.push({
				address: token.address,
				name: token.name,
				symbol: token.symbol,
				decimals: token.decimals,
				totalSupply: token.totalSupply,
				holderCount: token.holderCount,
				transferCount: token.transferCount,
				logoUri: token.logoUri,
				recentTransfers,
				holderDelta,
			});
		}

		return result;
	} catch (err) {
		console.error("[dashboard] getCreatorTokensWithStats failed:", err);
		return [];
	}
}

export interface UnlockEvent {
	lockId: number;
	tokenName: string;
	tokenSymbol: string;
	tokenAddress: string;
	beneficiary: string;
	remainingAmount: string;
	endTime: Date;
	cliffEnd: Date;
}

export async function getUnlockCalendar(creatorAddress: string): Promise<UnlockEvent[]> {
	if (!isAddress(creatorAddress)) return [];

	try {
		const db = getDb();
		const addr = creatorAddress.toLowerCase();
		const now = new Date();

		const activeLocks = await db
			.select({
				lockId: schema.locks.lockId,
				tokenAddress: schema.locks.tokenAddress,
				beneficiary: schema.locks.beneficiaryAddress,
				totalAmount: schema.locks.totalAmount,
				claimedAmount: schema.locks.claimedAmount,
				startTime: schema.locks.startTime,
				endTime: schema.locks.endTime,
				cliffDuration: schema.locks.cliffDuration,
			})
			.from(schema.locks)
			.where(
				and(
					eq(schema.locks.creatorAddress, addr),
					eq(schema.locks.revoked, false),
					gt(schema.locks.endTime, now),
				),
			)
			.orderBy(asc(schema.locks.endTime));

		if (activeLocks.length === 0) return [];

		// Get token names for all lock token addresses
		const tokenAddresses = [...new Set(activeLocks.map((l) => l.tokenAddress))];
		const tokenInfos = await db
			.select({
				address: schema.tokenHubCache.address,
				name: schema.tokenHubCache.name,
				symbol: schema.tokenHubCache.symbol,
			})
			.from(schema.tokenHubCache)
			.where(
				sql`${schema.tokenHubCache.address} IN (${sql.join(
					tokenAddresses.map((a) => sql`${a}`),
					sql`, `,
				)})`,
			);

		const tokenMap = new Map(tokenInfos.map((t) => [t.address, t]));

		return activeLocks.map((lock) => {
			const tokenInfo = tokenMap.get(lock.tokenAddress);
			const remaining = BigInt(lock.totalAmount) - BigInt(lock.claimedAmount);
			const cliffEnd = new Date(new Date(lock.startTime).getTime() + lock.cliffDuration * 1000);

			return {
				lockId: lock.lockId,
				tokenName: tokenInfo?.name ?? "Unknown",
				tokenSymbol: tokenInfo?.symbol ?? "???",
				tokenAddress: lock.tokenAddress,
				beneficiary: lock.beneficiary,
				remainingAmount: remaining.toString(),
				endTime: lock.endTime,
				cliffEnd,
			};
		});
	} catch (err) {
		console.error("[dashboard] getUnlockCalendar failed:", err);
		return [];
	}
}
