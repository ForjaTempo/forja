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
		<div className="overflow-hidden rounded-3xl border border-border-subtle bg-bg-elevated p-5 shadow-[0_20px_60px_rgba(0,0,0,0.3)] sm:p-6">
			<div className="mb-4 flex items-center justify-between">
				<div className="font-mono text-[10px] text-text-tertiary uppercase tracking-[0.14em]">
					{scope === "user" ? "Your recent swaps" : "Global recent swaps"}
				</div>
				<button
					type="button"
					onClick={() => refetch(true)}
					disabled={isLoading || isRefreshing}
					aria-label="Refresh swaps"
					className="inline-flex size-7 items-center justify-center rounded-lg text-text-tertiary transition-colors hover:bg-bg-field hover:text-gold disabled:opacity-40"
				>
					<RefreshCwIcon className={cn("size-3.5", isRefreshing && "animate-spin")} />
				</button>
			</div>
			{isLoading && (
				<p className="py-6 text-center font-mono text-[11px] text-text-tertiary uppercase tracking-[0.12em]">
					Loading…
				</p>
			)}
			{!isLoading && swaps.length === 0 && (
				<p className="py-6 text-center font-mono text-[11px] text-text-tertiary uppercase tracking-[0.12em]">
					No swaps yet
				</p>
			)}
			{!isLoading && swaps.length > 0 && (
				<ul className="-mx-2 divide-y divide-border-hair">
					{swaps.map((s) => {
						const usd = estimateSwapUsdValue(s);
						return (
							<li
								key={`${s.txHash}-${s.logIndex}`}
								className="flex items-center justify-between rounded-xl px-2 py-2.5 text-[12px] transition-colors hover:bg-bg-field/60"
							>
								<div className="min-w-0">
									<p className="truncate font-mono text-text-primary">
										{formatUnits(BigInt(s.amountIn), TIP20_DECIMALS)} {TRUNCATE(s.tokenIn)}{" "}
										<span className="text-text-tertiary">→</span>{" "}
										{formatUnits(BigInt(s.amountOut), TIP20_DECIMALS)} {TRUNCATE(s.tokenOut)}
									</p>
									<p className="mt-0.5 font-mono text-[10.5px] text-text-tertiary">
										{new Date(s.createdAt).toLocaleString()}
										{usd !== null && <span className="ml-2 text-gold/80">≈ {formatUsd(usd)}</span>}
									</p>
								</div>
								<a
									href={`${explorer}/tx/${s.txHash}`}
									target="_blank"
									rel="noopener noreferrer"
									aria-label="View on explorer"
									className="ml-3 inline-flex size-7 shrink-0 items-center justify-center rounded-lg text-text-tertiary transition-colors hover:bg-bg-field hover:text-gold"
								>
									<ExternalLinkIcon className="size-3.5" />
								</a>
							</li>
						);
					})}
				</ul>
			)}
		</div>
	);
}
