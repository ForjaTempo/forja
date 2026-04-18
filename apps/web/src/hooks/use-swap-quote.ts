"use client";

import { useEffect, useState } from "react";
import { getSwapQuote, type SerializedSwapQuote } from "@/actions/swaps";

interface UseSwapQuoteParams {
	tokenIn: string | undefined;
	tokenOut: string | undefined;
	amountIn: bigint;
	slippageBps: number;
	enabled?: boolean;
	debounceMs?: number;
}

interface UseSwapQuoteReturn {
	quote: SerializedSwapQuote | null;
	isLoading: boolean;
	error: string | null;
}

const REASON_MESSAGES: Record<string, string> = {
	no_pool: "No Uniswap v4 pool for this pair yet.",
	pool_drained: "Pool exists but in-range liquidity is zero — try again after LPs re-deposit.",
	zero_estimate: "Amount too small to estimate — try a larger input.",
	invalid_input: "Invalid token addresses or amount.",
	rpc_error: "Network error while fetching quote. Try again in a moment.",
};

/**
 * Debounced swap quote fetcher. Re-runs whenever inputs change after
 * `debounceMs` of stillness. Returns the latest server-side estimate plus
 * loading + error state for the form to render.
 */
export function useSwapQuote({
	tokenIn,
	tokenOut,
	amountIn,
	slippageBps,
	enabled = true,
	debounceMs = 350,
}: UseSwapQuoteParams): UseSwapQuoteReturn {
	const [quote, setQuote] = useState<SerializedSwapQuote | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!enabled || !tokenIn || !tokenOut || amountIn <= 0n) {
			setQuote(null);
			setError(null);
			setIsLoading(false);
			return;
		}

		let cancelled = false;
		setIsLoading(true);
		setError(null);

		const handle = setTimeout(async () => {
			try {
				const result = await getSwapQuote({
					tokenIn,
					tokenOut,
					amountIn: amountIn.toString(),
					slippageBps,
				});
				if (cancelled) return;
				if ("quote" in result) {
					setQuote(result.quote);
				} else {
					setQuote(null);
					setError(REASON_MESSAGES[result.reason] ?? "Quote unavailable");
				}
			} catch (e) {
				if (cancelled) return;
				setError(e instanceof Error ? e.message : "Quote failed");
				setQuote(null);
			} finally {
				if (!cancelled) setIsLoading(false);
			}
		}, debounceMs);

		return () => {
			cancelled = true;
			clearTimeout(handle);
		};
	}, [tokenIn, tokenOut, amountIn, slippageBps, enabled, debounceMs]);

	return { quote, isLoading, error };
}
