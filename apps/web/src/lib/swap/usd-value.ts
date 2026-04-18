import { formatUnits } from "viem";
import { TEMPO_STABLECOINS, TIP20_DECIMALS } from "../constants";

/**
 * Pick the USD-denominated leg of a swap.
 *
 * Every FORJA swap that actually fills goes through either a stablecoin or
 * pathUSD, so one leg's amount is a good USD proxy. Preference order:
 *   1. tokenOut if it's a stablecoin (what the user received — most honest)
 *   2. tokenIn if it's a stablecoin
 *   3. null (neither side is a known stablecoin — can't estimate)
 */
export function estimateSwapUsdValue(swap: {
	tokenIn: string;
	tokenOut: string;
	amountIn: string;
	amountOut: string;
}): number | null {
	const inLower = swap.tokenIn.toLowerCase();
	const outLower = swap.tokenOut.toLowerCase();

	if (TEMPO_STABLECOINS.has(outLower)) {
		return Number(formatUnits(BigInt(swap.amountOut), TIP20_DECIMALS));
	}
	if (TEMPO_STABLECOINS.has(inLower)) {
		return Number(formatUnits(BigInt(swap.amountIn), TIP20_DECIMALS));
	}
	return null;
}

/**
 * Format USD amount for compact display — "$12.34" for small values,
 * "$1.2k" / "$3.4M" for large ones.
 */
export function formatUsd(value: number): string {
	if (value < 0.01) return "<$0.01";
	if (value < 1_000) return `$${value.toFixed(2)}`;
	if (value < 1_000_000) return `$${(value / 1_000).toFixed(1)}k`;
	return `$${(value / 1_000_000).toFixed(2)}M`;
}
