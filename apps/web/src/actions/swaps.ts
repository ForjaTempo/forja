"use server";
import { getDb, schema } from "@forja/db";
import { and, count, desc, eq, gte, or, sql } from "drizzle-orm";
import { type Address, isAddress } from "viem";
import { indexerClient } from "@/lib/indexer/client";
import { getQuote, hasLiquidity, type SwapQuote } from "@/lib/swap/quoter";

const DAY_MS = 24 * 60 * 60 * 1000;

export type SwapRow = typeof schema.swaps.$inferSelect;

export interface SwapStats {
	totalSwaps: number;
	swaps24h: number;
	uniqueSwappers: number;
	totalFeesCollected: string; // BigInt as string, fee currency varies per swap
}

/**
 * Recent swap history, optionally filtered by user or token.
 * Used by /dashboard Swaps tab and the user's profile feed.
 */
export async function getSwapHistory(params: {
	user?: string;
	tokenAddress?: string;
	limit?: number;
	offset?: number;
}): Promise<{ swaps: SwapRow[]; total: number }> {
	const limit = params.limit ?? 20;
	const offset = params.offset ?? 0;

	try {
		const db = getDb();
		const conditions = [];

		if (params.user) {
			if (!isAddress(params.user)) return { swaps: [], total: 0 };
			conditions.push(eq(schema.swaps.userAddress, params.user.toLowerCase()));
		}
		if (params.tokenAddress) {
			if (!isAddress(params.tokenAddress)) return { swaps: [], total: 0 };
			const addr = params.tokenAddress.toLowerCase();
			conditions.push(or(eq(schema.swaps.tokenIn, addr), eq(schema.swaps.tokenOut, addr)));
		}

		const where = conditions.length > 0 ? and(...conditions) : undefined;

		const [rows, [totalResult]] = await Promise.all([
			db
				.select()
				.from(schema.swaps)
				.where(where)
				.orderBy(desc(schema.swaps.blockNumber), desc(schema.swaps.logIndex))
				.offset(offset)
				.limit(limit),
			db.select({ value: count() }).from(schema.swaps).where(where),
		]);

		return { swaps: rows, total: totalResult?.value ?? 0 };
	} catch (err) {
		console.error("[swaps] getSwapHistory failed:", err);
		return { swaps: [], total: 0 };
	}
}

/**
 * Aggregate swap activity for the global stats strip.
 * `totalFeesCollected` sums every fee_amount as raw bigint string. Mixed-token
 * fees are NOT converted to a USD basis here — that's a UI concern.
 */
export async function getSwapStats(): Promise<SwapStats> {
	try {
		const db = getDb();
		const since24h = new Date(Date.now() - DAY_MS);

		const [[totalResult], [recentResult], [uniqueResult], [feeResult]] = await Promise.all([
			db.select({ value: count() }).from(schema.swaps),
			db.select({ value: count() }).from(schema.swaps).where(gte(schema.swaps.createdAt, since24h)),
			db
				.select({ value: sql<number>`COUNT(DISTINCT ${schema.swaps.userAddress})` })
				.from(schema.swaps),
			db
				.select({
					value: sql<string>`COALESCE(SUM(CAST(${schema.swaps.feeAmount} AS NUMERIC)), 0)`,
				})
				.from(schema.swaps),
		]);

		return {
			totalSwaps: totalResult?.value ?? 0,
			swaps24h: recentResult?.value ?? 0,
			uniqueSwappers: Number(uniqueResult?.value ?? 0),
			totalFeesCollected: feeResult?.value ?? "0",
		};
	} catch (err) {
		console.error("[swaps] getSwapStats failed:", err);
		return { totalSwaps: 0, swaps24h: 0, uniqueSwappers: 0, totalFeesCollected: "0" };
	}
}

/**
 * Per-token swap volume bucketed by day for chart rendering.
 * `volume` is a NUMERIC string of raw amountIn units (caller formats by decimals).
 */
export async function getSwapVolumeByToken(
	tokenAddress: string,
	days = 30,
): Promise<Array<{ date: Date; volume: string; swapCount: number }>> {
	if (!isAddress(tokenAddress)) return [];
	try {
		const db = getDb();
		const addr = tokenAddress.toLowerCase();
		const since = new Date(Date.now() - days * DAY_MS);

		const rows = await db
			.select({
				date: sql<Date>`DATE_TRUNC('day', ${schema.swaps.createdAt})`,
				volume: sql<string>`COALESCE(SUM(CAST(${schema.swaps.amountIn} AS NUMERIC)), 0)::TEXT`,
				swapCount: count(),
			})
			.from(schema.swaps)
			.where(
				and(
					or(eq(schema.swaps.tokenIn, addr), eq(schema.swaps.tokenOut, addr)),
					gte(schema.swaps.createdAt, since),
				),
			)
			.groupBy(sql`DATE_TRUNC('day', ${schema.swaps.createdAt})`)
			.orderBy(sql`DATE_TRUNC('day', ${schema.swaps.createdAt}) ASC`);

		return rows.map((r) => ({ date: r.date, volume: r.volume, swapCount: r.swapCount }));
	} catch (err) {
		console.error("[swaps] getSwapVolumeByToken failed:", err);
		return [];
	}
}

/**
 * Serializable shape of a SwapQuote — all bigints become decimal strings so
 * the result crosses the server-action boundary cleanly.
 */
export interface SerializedSwapQuote {
	tokenIn: string;
	tokenOut: string;
	amountIn: string;
	forjaFee: string;
	amountInAfterFee: string;
	amountOut: string;
	minAmountOut: string;
	priceImpactBps: number;
	poolKey: {
		currency0: string;
		currency1: string;
		fee: number;
		tickSpacing: number;
		hooks: string;
	};
	zeroForOne: boolean;
	sqrtPriceLimitX96: string;
	sqrtPriceX96Before: string;
	sqrtPriceX96After: string;
}

function serializeQuote(q: SwapQuote): SerializedSwapQuote {
	return {
		tokenIn: q.tokenIn,
		tokenOut: q.tokenOut,
		amountIn: q.amountIn.toString(),
		forjaFee: q.forjaFee.toString(),
		amountInAfterFee: q.amountInAfterFee.toString(),
		amountOut: q.amountOut.toString(),
		minAmountOut: q.minAmountOut.toString(),
		priceImpactBps: q.priceImpactBps,
		poolKey: { ...q.poolKey },
		zeroForOne: q.zeroForOne,
		sqrtPriceLimitX96: q.sqrtPriceLimitX96.toString(),
		sqrtPriceX96Before: q.sqrtPriceX96Before.toString(),
		sqrtPriceX96After: q.sqrtPriceX96After.toString(),
	};
}

/**
 * Off-chain swap quote. Probes standard v4 fee tiers and picks the pool with
 * the most output. Returns `null` when no liquidity exists for the pair.
 *
 * The estimate uses single-range constant-product math; the on-chain
 * `minAmountOut` floor (from `slippageBps`) protects users from real-world
 * tick crossings.
 */
export async function getSwapQuote(params: {
	tokenIn: string;
	tokenOut: string;
	amountIn: string;
	slippageBps: number;
}): Promise<SerializedSwapQuote | null> {
	if (!isAddress(params.tokenIn) || !isAddress(params.tokenOut)) return null;
	if (params.tokenIn.toLowerCase() === params.tokenOut.toLowerCase()) return null;

	let amountIn: bigint;
	try {
		amountIn = BigInt(params.amountIn);
	} catch {
		return null;
	}
	if (amountIn <= 0n) return null;
	if (params.slippageBps < 0 || params.slippageBps > 5_000) return null;

	try {
		const quote = await getQuote({
			client: indexerClient,
			tokenIn: params.tokenIn as Address,
			tokenOut: params.tokenOut as Address,
			amountIn,
			slippageBps: params.slippageBps,
		});
		if (!quote) return null;
		return serializeQuote(quote);
	} catch (err) {
		console.error("[swaps] getSwapQuote failed:", err);
		return null;
	}
}

/**
 * Cheap pool-existence check. Used by Token Hub / detail pages to gate the
 * Swap CTA without computing a full quote.
 */
export async function checkSwapAvailable(tokenA: string, tokenB: string): Promise<boolean> {
	if (!isAddress(tokenA) || !isAddress(tokenB)) return false;
	if (tokenA.toLowerCase() === tokenB.toLowerCase()) return false;
	try {
		return await hasLiquidity(indexerClient, tokenA as Address, tokenB as Address);
	} catch (err) {
		console.error("[swaps] checkSwapAvailable failed:", err);
		return false;
	}
}

/**
 * Top traded tokens by swap count in the trailing window. Used to surface
 * "Popular pairs" on the swap landing page.
 */
export async function getTopSwappedTokens(
	limitCount = 10,
): Promise<Array<{ tokenAddress: string; swapCount: number }>> {
	try {
		const db = getDb();
		// Simple union of tokenIn + tokenOut counts; tokenIn weighted equally.
		const rows = await db.execute<{ token_address: string; swap_count: number }>(
			sql`
				SELECT addr AS token_address, COUNT(*)::int AS swap_count FROM (
					SELECT ${schema.swaps.tokenIn} AS addr FROM ${schema.swaps}
					UNION ALL
					SELECT ${schema.swaps.tokenOut} AS addr FROM ${schema.swaps}
				) t
				GROUP BY addr
				ORDER BY swap_count DESC
				LIMIT ${limitCount}
			`,
		);

		return rows.map((r) => ({ tokenAddress: r.token_address, swapCount: r.swap_count }));
	} catch (err) {
		console.error("[swaps] getTopSwappedTokens failed:", err);
		return [];
	}
}
