"use client";

import { ExternalLinkIcon, RefreshCwIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { formatUnits } from "viem";
import { useAccount } from "wagmi";
import { getSwapHistory, type SwapRow } from "@/actions/swaps";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
		<Card className="border-border-subtle bg-surface-card">
			<CardHeader className="flex flex-row items-center justify-between space-y-0">
				<CardTitle className="text-sm">
					{scope === "user" ? "Your recent swaps" : "Recent swaps"}
				</CardTitle>
				<button
					type="button"
					onClick={() => refetch(true)}
					disabled={isLoading || isRefreshing}
					className="text-smoke-dark transition-colors hover:text-indigo disabled:opacity-40"
					title="Refresh"
				>
					<RefreshCwIcon className={cn("size-3.5", isRefreshing && "animate-spin")} />
				</button>
			</CardHeader>
			<CardContent>
				{isLoading && <p className="py-4 text-center text-xs text-smoke-dark">Loading…</p>}
				{!isLoading && swaps.length === 0 && (
					<p className="py-4 text-center text-xs text-smoke-dark">No swaps yet.</p>
				)}
				{!isLoading && swaps.length > 0 && (
					<ul className="divide-y divide-border-subtle">
						{swaps.map((s) => {
							const usd = estimateSwapUsdValue(s);
							return (
								<li
									key={`${s.txHash}-${s.logIndex}`}
									className="flex items-center justify-between py-2 text-xs"
								>
									<div className="min-w-0">
										<p className="truncate text-steel-white">
											{formatUnits(BigInt(s.amountIn), TIP20_DECIMALS)} {TRUNCATE(s.tokenIn)} →{" "}
											{formatUnits(BigInt(s.amountOut), TIP20_DECIMALS)} {TRUNCATE(s.tokenOut)}
										</p>
										<p className="text-smoke-dark">
											{new Date(s.createdAt).toLocaleString()}
											{usd !== null && <span className="ml-2 text-smoke">≈ {formatUsd(usd)}</span>}
										</p>
									</div>
									<a
										href={`${explorer}/tx/${s.txHash}`}
										target="_blank"
										rel="noopener noreferrer"
										className="ml-3 shrink-0 text-smoke-dark hover:text-indigo"
									>
										<ExternalLinkIcon className="size-3.5" />
									</a>
								</li>
							);
						})}
					</ul>
				)}
			</CardContent>
		</Card>
	);
}
