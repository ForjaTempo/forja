import "server-only";
import type { Address, PublicClient } from "viem";
import { isStablecoinPair, SWAP_FEE_BPS } from "../constants";
import { estimateAmountOut, priceImpactBps, SQRT_PRICE_LIMIT } from "./math";
import { buildPoolKey, type PoolKey, STANDARD_FEE_TIERS } from "./pool";
import { readPoolState } from "./pool-state";
import { quoteStablecoinSwap } from "./stablecoin-dex";

export type SwapVenue = "v4" | "enshrined";

/** Shared fields across both venues. */
type SwapQuoteBase = {
	tokenIn: Address;
	tokenOut: Address;
	amountIn: bigint;
	/** Protocol fee skimmed by ForjaSwapRouter (0.25% by default). */
	forjaFee: bigint;
	/** What actually goes into the venue after the fee skim. */
	amountInAfterFee: bigint;
	/** Indicative output, before slippage. Real value comes from on-chain execution. */
	amountOut: bigint;
	/** Output floor enforced by the router via `minAmountOut`. */
	minAmountOut: bigint;
	/** Estimated price impact in basis points (100 = 1%). */
	priceImpactBps: number;
};

export type SwapQuote = SwapQuoteBase &
	(
		| {
				venue: "v4";
				poolKey: PoolKey;
				zeroForOne: boolean;
				sqrtPriceLimitX96: bigint;
				sqrtPriceX96Before: bigint;
				sqrtPriceX96After: bigint;
		  }
		| { venue: "enshrined" }
	);

export type GetQuoteParams = {
	client: PublicClient;
	tokenIn: Address;
	tokenOut: Address;
	amountIn: bigint;
	/** User-selected slippage tolerance in basis points (50 = 0.5%, 100 = 1%, 300 = 3%). */
	slippageBps: number;
};

/** Reason codes for quote failures so the UI can render a useful message. */
export type QuoteFailureReason = "no_pool" | "pool_drained" | "zero_estimate";

/**
 * Quote an exact-input swap by probing standard v4 fee tiers and picking the
 * pool that delivers the most output.
 *
 * Returns:
 *   - `{ quote }` when at least one pool has in-range liquidity
 *   - `{ reason: "pool_drained" }` if ≥1 pool is initialised but has 0
 *     in-range liquidity (token was tradeable but LPs withdrew)
 *   - `{ reason: "no_pool" }` if no v4 pool exists at the probed tiers
 *   - `{ reason: "zero_estimate" }` if the math short-circuits to 0
 */
export async function getQuoteDetailed(
	params: GetQuoteParams,
): Promise<{ quote: SwapQuote } | { reason: QuoteFailureReason }> {
	const { client, tokenIn, tokenOut, amountIn, slippageBps } = params;

	if (amountIn === 0n) return { reason: "zero_estimate" };
	if (tokenIn.toLowerCase() === tokenOut.toLowerCase()) return { reason: "no_pool" };

	const forjaFee = (amountIn * BigInt(SWAP_FEE_BPS)) / 10_000n;
	const amountInAfterFee = amountIn - forjaFee;

	// Stablecoin↔stablecoin pairs route through Tempo's native precompile DEX,
	// not Uniswap v4. Try that venue first; fall through to v4 if the
	// precompile can't fill (e.g. pair not on the enshrined DEX).
	if (isStablecoinPair(tokenIn, tokenOut)) {
		const stableOut = await quoteStablecoinSwap(client, tokenIn, tokenOut, amountInAfterFee);
		if (stableOut && stableOut > 0n) {
			const minAmountOut = (stableOut * BigInt(10_000 - slippageBps)) / 10_000n;
			// Price impact on the enshrined DEX is already reflected in the
			// precompile's quote; we expose a naive midpoint-delta as the
			// displayed impact (input→output deviation from 1:1).
			const mid =
				amountInAfterFee > 0n
					? Number(((amountInAfterFee - stableOut) * 10_000n) / amountInAfterFee)
					: 0;
			const impact = mid < 0 ? -mid : mid;
			return {
				quote: {
					venue: "enshrined",
					tokenIn,
					tokenOut,
					amountIn,
					forjaFee,
					amountInAfterFee,
					amountOut: stableOut,
					minAmountOut,
					priceImpactBps: impact,
				},
			};
		}
		// If the precompile can't fill, keep going — maybe a v4 pool exists.
	}

	let anyPoolExists = false;

	const candidates = await Promise.all(
		STANDARD_FEE_TIERS.map(async ({ fee, tickSpacing }) => {
			const { key, zeroForOneIfInputIsTokenA } = buildPoolKey(tokenIn, tokenOut, fee, tickSpacing);
			const state = await readPoolState(client, key);
			if (!state.exists) return null;
			anyPoolExists = true;
			if (state.liquidity === 0n) return null;

			const zeroForOne = zeroForOneIfInputIsTokenA;
			const { amountOut, sqrtPriceX96After } = estimateAmountOut(
				state.slot0.sqrtPriceX96,
				state.liquidity,
				amountInAfterFee,
				zeroForOne,
			);
			if (amountOut === 0n) return null;

			return {
				key,
				zeroForOne,
				sqrtPriceX96Before: state.slot0.sqrtPriceX96,
				sqrtPriceX96After,
				amountOut,
			};
		}),
	);

	const valid = candidates.filter((c): c is NonNullable<typeof c> => c !== null);
	if (valid.length === 0) {
		return { reason: anyPoolExists ? "pool_drained" : "no_pool" };
	}

	// Pick the route with the highest amountOut.
	const best = valid.reduce((a, b) => (b.amountOut > a.amountOut ? b : a));

	const minAmountOut = (best.amountOut * BigInt(10_000 - slippageBps)) / 10_000n;
	const impact = priceImpactBps(
		best.sqrtPriceX96Before,
		amountInAfterFee,
		best.amountOut,
		best.zeroForOne,
	);

	const sqrtPriceLimitX96 = best.zeroForOne
		? SQRT_PRICE_LIMIT.MIN_PLUS_ONE
		: SQRT_PRICE_LIMIT.MAX_MINUS_ONE;

	return {
		quote: {
			venue: "v4",
			tokenIn,
			tokenOut,
			amountIn,
			forjaFee,
			amountInAfterFee,
			amountOut: best.amountOut,
			minAmountOut,
			priceImpactBps: impact,
			poolKey: best.key,
			zeroForOne: best.zeroForOne,
			sqrtPriceLimitX96,
			sqrtPriceX96Before: best.sqrtPriceX96Before,
			sqrtPriceX96After: best.sqrtPriceX96After,
		},
	};
}

/** Backwards-compatible wrapper that drops the reason code. */
export async function getQuote(params: GetQuoteParams): Promise<SwapQuote | null> {
	const result = await getQuoteDetailed(params);
	return "quote" in result ? result.quote : null;
}

/**
 * Cheap "does a pool exist?" check used by Token Hub to gate the Swap button
 * without computing a full quote. Returns true if any standard fee tier has
 * an initialised, liquid pool for the pair.
 */
export async function hasLiquidity(
	client: PublicClient,
	tokenA: Address,
	tokenB: Address,
): Promise<boolean> {
	if (tokenA.toLowerCase() === tokenB.toLowerCase()) return false;

	const checks = await Promise.all(
		STANDARD_FEE_TIERS.map(async ({ fee, tickSpacing }) => {
			const { key } = buildPoolKey(tokenA, tokenB, fee, tickSpacing);
			const state = await readPoolState(client, key);
			return state.exists && state.liquidity > 0n;
		}),
	);
	return checks.some(Boolean);
}
