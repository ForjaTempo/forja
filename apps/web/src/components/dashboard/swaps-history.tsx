"use client";

import { ArrowLeftRightIcon, ExternalLinkIcon, RefreshCwIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { formatUnits } from "viem";
import { useAccount } from "wagmi";
import { getSwapHistory, type SwapRow } from "@/actions/swaps";
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
					<Skeleton key={`s-${i.toString()}`} className="h-16 rounded-xl" />
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

	const usdVolume = swaps.reduce((acc, s) => acc + (estimateSwapUsdValue(s) ?? 0), 0);
	const usdFees = swaps.reduce((acc, s) => {
		const usd = estimateSwapUsdValue(s);
		if (usd === null) return acc;
		const inputBig = BigInt(s.amountIn);
		if (inputBig === 0n) return acc;
		const feeRatio = Number(BigInt(s.feeAmount)) / Number(inputBig);
		return acc + usd * feeRatio;
	}, 0);

	return (
		<div className="space-y-4">
			<div className="flex justify-end">
				<button
					type="button"
					onClick={() => refetch(true)}
					disabled={isRefreshing}
					className="inline-flex items-center gap-1.5 rounded-lg border border-border-hair bg-bg-field px-2.5 py-1 text-[11px] font-medium text-text-secondary transition-colors hover:border-border-subtle hover:text-gold disabled:opacity-40"
				>
					<RefreshCwIcon className={cn("size-3", isRefreshing && "animate-spin")} />
					Refresh
				</button>
			</div>
			<div className="grid grid-cols-3 gap-3">
				<StatCard label="Total swaps" value={swaps.length.toString()} />
				<StatCard label="Volume · USD" value={formatUsd(usdVolume)} />
				<StatCard label="Fees paid · USD" value={formatUsd(usdFees)} />
			</div>

			<div className="rounded-2xl border border-border-hair bg-bg-elevated">
				<ul>
					{swaps.map((s, i) => {
						const usd = estimateSwapUsdValue(s);
						return (
							<li
								key={`${s.txHash}-${s.logIndex}`}
								className={cn(
									"flex items-center justify-between px-5 py-3 text-[12.5px]",
									i > 0 && "border-border-hair border-t",
								)}
							>
								<div className="min-w-0">
									<p className="truncate font-mono text-text-primary">
										{formatUnits(BigInt(s.amountIn), TIP20_DECIMALS)} {TRUNCATE(s.tokenIn)}{" "}
										<span className="text-text-tertiary">→</span>{" "}
										{formatUnits(BigInt(s.amountOut), TIP20_DECIMALS)} {TRUNCATE(s.tokenOut)}
									</p>
									<p className="mt-0.5 font-mono text-[11px] text-text-tertiary">
										{new Date(s.createdAt).toLocaleString()} · fee{" "}
										{formatUnits(BigInt(s.feeAmount), TIP20_DECIMALS)}
										{usd !== null && <span className="ml-2">≈ {formatUsd(usd)}</span>}
									</p>
								</div>
								<a
									href={`${explorer}/tx/${s.txHash}`}
									target="_blank"
									rel="noopener noreferrer"
									className="ml-3 shrink-0 text-text-tertiary transition-colors hover:text-gold"
								>
									<ExternalLinkIcon className="size-3.5" />
								</a>
							</li>
						);
					})}
				</ul>
			</div>
		</div>
	);
}

function StatCard({ label, value }: { label: string; value: string }) {
	return (
		<div className="rounded-xl border border-border-hair bg-bg-elevated p-3.5">
			<p className="font-mono text-[10px] text-text-tertiary uppercase tracking-[0.12em]">
				{label}
			</p>
			<p className="mt-1 truncate font-display text-[18px] tracking-[-0.01em] text-text-primary">
				{value}
			</p>
		</div>
	);
}
