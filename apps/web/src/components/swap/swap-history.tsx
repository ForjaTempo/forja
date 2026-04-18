"use client";

import { ExternalLinkIcon, RefreshCwIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { formatUnits } from "viem";
import { useAccount } from "wagmi";
import { getSwapHistory, type SwapRow } from "@/actions/swaps";
import { useExplorerUrl } from "@/hooks/use-explorer-url";
import { TIP20_DECIMALS } from "@/lib/constants";
import { estimateSwapUsdValue, formatUsd } from "@/lib/swap/usd-value";
import { cn } from "@/lib/utils";

const TRUNCATE = (addr: string) => `${addr.slice(0, 6)}…${addr.slice(-4)}`;
const POLL_INTERVAL_MS = 20_000;

interface SwapHistoryProps {
	scope?: "user" | "global";
	limit?: number;
	/**
	 * Bumped by parent after a swap succeeds so this card re-fetches without
	 * waiting for the next poll tick.
	 */
	refreshKey?: number;
}

export function SwapHistory({ scope = "user", limit = 10, refreshKey = 0 }: SwapHistoryProps) {
	const { address } = useAccount();
	const explorer = useExplorerUrl();
	const [swaps, setSwaps] = useState<SwapRow[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [isRefreshing, setIsRefreshing] = useState(false);

	const refetch = useCallback(
		async (showSpinner = false) => {
			if (showSpinner) setIsRefreshing(true);
			try {
				const result = await getSwapHistory({
					user: scope === "user" ? address : undefined,
					limit,
				});
				setSwaps(result.swaps);
			} finally {
				setIsLoading(false);
				setIsRefreshing(false);
			}
		},
		[address, scope, limit],
	);

	useEffect(() => {
		// refreshKey is intentionally read so parent bumps trigger a refetch
		void refreshKey;
		refetch();
		const handle = setInterval(() => refetch(), POLL_INTERVAL_MS);
		return () => clearInterval(handle);
	}, [refetch, refreshKey]);

	if (scope === "user" && !address) return null;

	return (
		<div className="overflow-hidden rounded-2xl border border-border-hair bg-bg-elevated">
			<div className="flex items-center justify-between border-b border-border-hair px-4 py-3">
				<div className="font-display text-[15px] tracking-[-0.01em] text-text-primary">
					{scope === "user" ? "Your recent swaps" : "Recent swaps"}
				</div>
				<button
					type="button"
					onClick={() => refetch(true)}
					disabled={isLoading || isRefreshing}
					className="text-text-tertiary transition-colors hover:text-gold disabled:opacity-40"
					title="Refresh"
				>
					<RefreshCwIcon className={cn("size-3.5", isRefreshing && "animate-spin")} />
				</button>
			</div>
			<div className="px-4 py-2">
				{isLoading && <p className="py-4 text-center text-xs text-text-tertiary">Loading…</p>}
				{!isLoading && swaps.length === 0 && (
					<p className="py-4 text-center text-xs text-text-tertiary">No swaps yet.</p>
				)}
				{!isLoading && swaps.length > 0 && (
					<ul className="divide-y divide-border-hair">
						{swaps.map((s) => {
							const usd = estimateSwapUsdValue(s);
							return (
								<li
									key={`${s.txHash}-${s.logIndex}`}
									className="flex items-center justify-between py-2.5 text-xs"
								>
									<div className="min-w-0">
										<p className="truncate font-mono text-text-primary">
											{formatUnits(BigInt(s.amountIn), TIP20_DECIMALS)} {TRUNCATE(s.tokenIn)} →{" "}
											{formatUnits(BigInt(s.amountOut), TIP20_DECIMALS)} {TRUNCATE(s.tokenOut)}
										</p>
										<p className="font-mono text-text-tertiary">
											{new Date(s.createdAt).toLocaleString()}
											{usd !== null && (
												<span className="ml-2 text-text-secondary">≈ {formatUsd(usd)}</span>
											)}
										</p>
									</div>
									<a
										href={`${explorer}/tx/${s.txHash}`}
										target="_blank"
										rel="noopener noreferrer"
										className="ml-3 shrink-0 text-text-tertiary hover:text-gold"
									>
										<ExternalLinkIcon className="size-3.5" />
									</a>
								</li>
							);
						})}
					</ul>
				)}
			</div>
		</div>
	);
}
