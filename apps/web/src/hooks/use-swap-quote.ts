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
				setQuote(result);
				if (!result) setError("No liquidity for this pair");
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
