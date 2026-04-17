/**
 * Tick + price math used by the off-chain quoter. We mirror the small subset
 * of Uniswap v3/v4 helpers needed to translate a `sqrtPriceX96` into an
 * exchange rate, and to estimate `amountOut` for a small `amountIn` swap at
 * the current tick (constant-product within the active range).
 *
 * For larger swaps the exact amount comes from on-chain execution — the UI
 * relies on the user-set `minAmountOut` slippage check enforced by the
 * router for safety.
 */

const Q96 = 1n << 96n;

/**
 * Convert sqrtPriceX96 → spot price of currency0 expressed in currency1,
 * scaled by 1e18 for precision in pure-integer math.
 *
 * priceCurrency1PerCurrency0 = (sqrtPriceX96 / 2^96) ^ 2
 */
export function sqrtPriceX96ToPrice1Per0(sqrtPriceX96: bigint): bigint {
	if (sqrtPriceX96 === 0n) return 0n;
	const SCALE = 10n ** 18n;
	// (sqrtPriceX96^2 * 1e18) / 2^192
	const numerator = sqrtPriceX96 * sqrtPriceX96 * SCALE;
	const denominator = Q96 * Q96;
	return numerator / denominator;
}

/**
 * Compute the *new* sqrtPriceX96 after spending `amountIn` of either currency,
 * assuming the entire swap completes within the current active liquidity range
 * (i.e. no tick crossings). This is the standard v3/v4 single-step formula
 * documented in the Uniswap whitepaper.
 *
 * For zeroForOne (selling currency0 for currency1):
 *   sqrtPriceNext = (L * sqrtPrice) / (L + amountIn * sqrtPrice / Q96)
 *
 * For !zeroForOne (selling currency1 for currency0):
 *   sqrtPriceNext = sqrtPrice + (amountIn * Q96) / L
 */
function getNextSqrtPriceFromInput(
	sqrtPriceX96: bigint,
	liquidity: bigint,
	amountIn: bigint,
	zeroForOne: boolean,
): bigint {
	if (liquidity === 0n) return sqrtPriceX96;
	if (zeroForOne) {
		const numerator1 = liquidity * sqrtPriceX96;
		const product = amountIn * sqrtPriceX96;
		const denominator = liquidity * Q96 + product;
		return (numerator1 * Q96) / denominator;
	}
	return sqrtPriceX96 + (amountIn * Q96) / liquidity;
}

/**
 * Estimate exact-input swap output within current liquidity range.
 *
 * Returns the integer amountOut in the destination currency's native units.
 * Returns 0n when liquidity is empty (no pool depth) — caller should treat
 * that as an unswappable pair.
 *
 * NOTE: This does NOT walk ticks. For swaps that would cross ticks the real
 * amountOut will be lower than the estimate; rely on `minAmountOut` slippage
 * protection on-chain.
 */
export function estimateAmountOut(
	sqrtPriceX96: bigint,
	liquidity: bigint,
	amountIn: bigint,
	zeroForOne: boolean,
): { amountOut: bigint; sqrtPriceX96After: bigint } {
	if (liquidity === 0n || amountIn === 0n) {
		return { amountOut: 0n, sqrtPriceX96After: sqrtPriceX96 };
	}

	const sqrtPriceX96After = getNextSqrtPriceFromInput(
		sqrtPriceX96,
		liquidity,
		amountIn,
		zeroForOne,
	);

	let amountOut: bigint;
	if (zeroForOne) {
		// Selling currency0 → receiving currency1.
		// amountOut = L * (sqrtBefore - sqrtAfter) / Q96
		amountOut = (liquidity * (sqrtPriceX96 - sqrtPriceX96After)) / Q96;
	} else {
		// Selling currency1 → receiving currency0.
		// amountOut = L * Q96 * (sqrtAfter - sqrtBefore) / (sqrtBefore * sqrtAfter)
		const numerator = liquidity * Q96 * (sqrtPriceX96After - sqrtPriceX96);
		const denominator = sqrtPriceX96 * sqrtPriceX96After;
		amountOut = numerator / denominator;
	}

	return { amountOut, sqrtPriceX96After };
}

/**
 * Compute price impact in basis points: how much the execution price moved
 * away from the spot price. Returns a non-negative integer; 100 = 1%.
 *
 * Formula: |spotPrice - executionPrice| / spotPrice * 10000
 *   spotPrice = (sqrtPriceX96 / Q96)^2
 *   executionPrice = amountOut / amountIn (currency1 per currency0)
 */
export function priceImpactBps(
	sqrtPriceX96: bigint,
	amountIn: bigint,
	amountOut: bigint,
	zeroForOne: boolean,
): number {
	if (sqrtPriceX96 === 0n || amountIn === 0n || amountOut === 0n) return 0;

	const SCALE = 10n ** 18n;
	const spotPrice1Per0 = sqrtPriceX96ToPrice1Per0(sqrtPriceX96);
	if (spotPrice1Per0 === 0n) return 0;

	// Reduce both sides to "currency1 per currency0" so the ratio is comparable.
	const execPrice1Per0 = zeroForOne
		? (amountOut * SCALE) / amountIn
		: (amountIn * SCALE) / amountOut;

	const diff =
		spotPrice1Per0 > execPrice1Per0
			? spotPrice1Per0 - execPrice1Per0
			: execPrice1Per0 - spotPrice1Per0;
	return Number((diff * 10_000n) / spotPrice1Per0);
}

export const SQRT_PRICE_LIMIT = {
	/** Minimum sqrt price + 1 — passed when zeroForOne to allow full price drop. */
	MIN_PLUS_ONE: 4_295_128_740n,
	/** Maximum sqrt price - 1 — passed when !zeroForOne. */
	MAX_MINUS_ONE: 1_461_446_703_485_210_103_287_273_052_203_988_822_378_723_970_341n,
} as const;
