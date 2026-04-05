import "server-only";
import { getDb, schema } from "@forja/db";
import { and, count, eq, gte, lt, sql } from "drizzle-orm";

export async function aggregateAnalytics() {
	const db = getDb();

	// Get all FORJA-created tokens
	const forjaTokens = await db
		.select({
			address: schema.tokens.address,
			createdAt: schema.tokens.createdAt,
		})
		.from(schema.tokens);

	if (forjaTokens.length === 0) {
		return { tokensProcessed: 0, daysAggregated: 0 };
	}

	let totalDays = 0;

	for (const token of forjaTokens) {
		// Find the latest aggregated date for this token
		const [latest] = await db
			.select({ date: schema.tokenDailyStats.date })
			.from(schema.tokenDailyStats)
			.where(eq(schema.tokenDailyStats.tokenAddress, token.address))
			.orderBy(sql`${schema.tokenDailyStats.date} DESC`)
			.limit(1);

		// Start from the day after the last aggregate (or token creation date)
		const startDate = latest
			? new Date(new Date(latest.date).getTime() + 86_400_000)
			: startOfDay(token.createdAt);

		// End at start of today (don't aggregate incomplete day)
		const today = startOfDay(new Date());

		if (startDate >= today) continue;

		// Get current holder count (snapshot — same for all backfill days)
		const [holderResult] = await db
			.select({ value: count() })
			.from(schema.tokenHolderBalances)
			.where(
				and(
					eq(schema.tokenHolderBalances.tokenAddress, token.address),
					sql`CAST(${schema.tokenHolderBalances.balance} AS NUMERIC) > 0`,
				),
			);
		const currentHolderCount = holderResult?.value ?? 0;

		// Aggregate each missing day
		const current = new Date(startDate);
		while (current < today) {
			const dayStart = new Date(current);
			const dayEnd = new Date(current.getTime() + 86_400_000);

			const dayCondition = and(
				eq(schema.tokenTransfers.tokenAddress, token.address),
				gte(schema.tokenTransfers.createdAt, dayStart),
				lt(schema.tokenTransfers.createdAt, dayEnd),
			);

			const [transferResult] = await db
				.select({
					transferCount: count(),
					transferVolume: sql<string>`COALESCE(SUM(CAST(${schema.tokenTransfers.amount} AS NUMERIC)), 0)::TEXT`,
					uniqueSenders: sql<number>`COUNT(DISTINCT ${schema.tokenTransfers.fromAddress})`,
					uniqueReceivers: sql<number>`COUNT(DISTINCT ${schema.tokenTransfers.toAddress})`,
				})
				.from(schema.tokenTransfers)
				.where(dayCondition);

			await db
				.insert(schema.tokenDailyStats)
				.values({
					tokenAddress: token.address,
					date: dayStart,
					holderCount: currentHolderCount,
					transferCount: transferResult?.transferCount ?? 0,
					transferVolume: transferResult?.transferVolume ?? "0",
					uniqueSenders: Number(transferResult?.uniqueSenders ?? 0),
					uniqueReceivers: Number(transferResult?.uniqueReceivers ?? 0),
				})
				.onConflictDoUpdate({
					target: [schema.tokenDailyStats.tokenAddress, schema.tokenDailyStats.date],
					set: {
						holderCount: currentHolderCount,
						transferCount: transferResult?.transferCount ?? 0,
						transferVolume: transferResult?.transferVolume ?? "0",
						uniqueSenders: Number(transferResult?.uniqueSenders ?? 0),
						uniqueReceivers: Number(transferResult?.uniqueReceivers ?? 0),
					},
				});

			totalDays++;
			current.setDate(current.getDate() + 1);
		}
	}

	return { tokensProcessed: forjaTokens.length, daysAggregated: totalDays };
}

function startOfDay(date: Date): Date {
	const d = new Date(date);
	d.setUTCHours(0, 0, 0, 0);
	return d;
}
