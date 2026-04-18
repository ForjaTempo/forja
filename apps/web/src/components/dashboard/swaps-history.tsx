"use client";

import { ArrowLeftRightIcon, ExternalLinkIcon, RefreshCwIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { formatUnits } from "viem";
import { useAccount } from "wagmi";
import { getSwapHistory, type SwapRow } from "@/actions/swaps";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useExplorerUrl } from "@/hooks/use-explorer-url";
import { TIP20_DECIMALS } from "@/lib/constants";
import { estimateSwapUsdValue, formatUsd } from "@/lib/swap/usd-value";
import { cn } from "@/lib/utils";

const TRUNCATE = (addr: string) => `${addr.slice(0, 6)}…${addr.slice(-4)}`;
const POLL_INTERVAL_MS = 20_000;

export function SwapsHistory() {
	const { address } = useAccount();
	const explorer = useExplorerUrl();
	const [swaps, setSwaps] = useState<SwapRow[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [isRefreshing, setIsRefreshing] = useState(false);

	const refetch = useCallback(
		async (showSpinner = false) => {
			if (!address) {
				setSwaps([]);
				setIsLoading(false);
				return;
			}
			if (showSpinner) setIsRefreshing(true);
			try {
				const result = await getSwapHistory({ user: address, limit: 50 });
				setSwaps(result.swaps);
			} finally {
				setIsLoading(false);
				setIsRefreshing(false);
			}
		},
		[address],
	);

	useEffect(() => {
		refetch();
		const handle = setInterval(() => refetch(), POLL_INTERVAL_MS);
		return () => clearInterval(handle);
	}, [refetch]);

	if (isLoading) {
		return (
			<div className="space-y-3">
				{Array.from({ length: 4 }).map((_, i) => (
					<Skeleton key={`s-${i.toString()}`} className="h-16 rounded-lg" />
				))}
			</div>
		);
	}

	if (swaps.length === 0) {
		return (
			<EmptyState
				icon={<ArrowLeftRightIcon className="size-8" />}
				title="No swaps yet"
				description="Trades you make through the FORJA swap router will appear here."
			/>
		);
	}

	// Sum USD-denominated legs for a realistic volume/fee total. Swaps whose
	// neither leg is a stablecoin are dropped from the USD totals (rare in
	// practice since almost every swap involves pathUSD).
	const usdVolume = swaps.reduce((acc, s) => acc + (estimateSwapUsdValue(s) ?? 0), 0);
	const usdFees = swaps.reduce((acc, s) => {
		const usd = estimateSwapUsdValue(s);
		if (usd === null) return acc;
		// Fee is 0.25% of input; if input was the stablecoin leg its ratio maps
		// back to USD directly. Approximate by applying the same input ratio.
		const inputBig = BigInt(s.amountIn);
		if (inputBig === 0n) return acc;
		const feeRatio = Number(BigInt(s.feeAmount)) / Number(inputBig);
		return acc + usd * feeRatio;
	}, 0);

	return (
		<div className="space-y-3">
			<div className="flex items-center justify-between">
				<div />
				<button
					type="button"
					onClick={() => refetch(true)}
					disabled={isRefreshing}
					className="flex items-center gap-1 text-xs text-smoke-dark transition-colors hover:text-indigo disabled:opacity-40"
				>
					<RefreshCwIcon className={cn("size-3.5", isRefreshing && "animate-spin")} />
					Refresh
				</button>
			</div>
			<div className="grid grid-cols-3 gap-3 text-xs">
				<StatCard label="Total swaps" value={swaps.length.toString()} />
				<StatCard label="Volume (USD)" value={formatUsd(usdVolume)} />
				<StatCard label="Fees paid (USD)" value={formatUsd(usdFees)} />
			</div>

			<Card className="border-anvil-gray-light bg-deep-charcoal">
				<CardContent className="p-0">
					<ul className="divide-y divide-anvil-gray-light">
						{swaps.map((s) => {
							const usd = estimateSwapUsdValue(s);
							return (
								<li
									key={`${s.txHash}-${s.logIndex}`}
									className="flex items-center justify-between px-4 py-3 text-xs"
								>
									<div className="min-w-0">
										<p className="truncate text-steel-white">
											{formatUnits(BigInt(s.amountIn), TIP20_DECIMALS)} {TRUNCATE(s.tokenIn)} →{" "}
											{formatUnits(BigInt(s.amountOut), TIP20_DECIMALS)} {TRUNCATE(s.tokenOut)}
										</p>
										<p className="text-smoke-dark">
											{new Date(s.createdAt).toLocaleString()} · fee{" "}
											{formatUnits(BigInt(s.feeAmount), TIP20_DECIMALS)}
											{usd !== null && <span className="ml-2">≈ {formatUsd(usd)}</span>}
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
				</CardContent>
			</Card>
		</div>
	);
}

function StatCard({ label, value }: { label: string; value: string }) {
	return (
		<Card className="border-anvil-gray-light bg-deep-charcoal">
			<CardContent className="p-3">
				<p className="text-smoke-dark">{label}</p>
				<p className="mt-1 truncate font-mono text-sm text-steel-white">{value}</p>
			</CardContent>
		</Card>
	);
}
