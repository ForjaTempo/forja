"use client";

import { ChevronDownIcon, ExternalLinkIcon, RefreshCwIcon } from "lucide-react";
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
	refreshKey?: number;
}

export function SwapHistory({ scope = "user", limit = 10, refreshKey = 0 }: SwapHistoryProps) {
	const { address } = useAccount();
	const explorer = useExplorerUrl();
	const [swaps, setSwaps] = useState<SwapRow[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [expandedKey, setExpandedKey] = useState<string | null>(null);

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
				<div className="flex flex-col items-center gap-1.5 py-8 text-center">
					<p className="font-display text-[15px] tracking-[-0.01em] text-text-primary">
						No swaps yet
					</p>
					<p className="text-[12px] text-text-tertiary">
						{scope === "user" ? "Your trades will appear here." : "Be the first to trade on FORJA."}
					</p>
				</div>
			)}
			{!isLoading && swaps.length > 0 && (
				<ul className="-mx-2 divide-y divide-border-hair/60">
					{swaps.map((s) => {
						const key = `${s.txHash}-${s.logIndex}`;
						const isExpanded = expandedKey === key;
						const usd = estimateSwapUsdValue(s);
						const amountIn = formatUnits(BigInt(s.amountIn), TIP20_DECIMALS);
						const amountOut = formatUnits(BigInt(s.amountOut), TIP20_DECIMALS);
						const fee = formatUnits(BigInt(s.feeAmount), TIP20_DECIMALS);
						return (
							<li key={key}>
								<button
									type="button"
									onClick={() => setExpandedKey(isExpanded ? null : key)}
									className={cn(
										"flex w-full items-center justify-between rounded-xl px-2 py-2.5 text-left text-[12px] transition-colors",
										isExpanded ? "bg-bg-field/60" : "hover:bg-bg-field/40",
									)}
									aria-expanded={isExpanded}
								>
									<div className="min-w-0">
										<p className="truncate font-mono text-text-primary">
											{amountIn} {TRUNCATE(s.tokenIn)} <span className="text-text-tertiary">→</span>{" "}
											{amountOut} {TRUNCATE(s.tokenOut)}
										</p>
										<p className="mt-0.5 font-mono text-[10.5px] text-text-tertiary">
											{new Date(s.createdAt).toLocaleString()}
											{usd !== null && (
												<span className="ml-2 text-gold/80">≈ {formatUsd(usd)}</span>
											)}
										</p>
									</div>
									<ChevronDownIcon
										className={cn(
											"ml-3 size-3.5 shrink-0 text-text-tertiary transition-transform",
											isExpanded && "rotate-180 text-gold",
										)}
									/>
								</button>

								{isExpanded && (
									<div className="mx-2 mb-2 space-y-2.5 rounded-xl border border-border-hair bg-bg-field/50 p-3.5 font-mono text-[11px]">
										<DetailRow label="Sold" value={`${amountIn} ${TRUNCATE(s.tokenIn)}`} />
										<DetailRow
											label="Received"
											value={`${amountOut} ${TRUNCATE(s.tokenOut)}`}
											accent="gold"
										/>
										<DetailRow label="Fee · 0.25%" value={`${fee} ${TRUNCATE(s.tokenIn)}`} />
										{usd !== null && (
											<DetailRow label="USD value" value={formatUsd(usd)} accent="gold" />
										)}
										<DetailRow label="Trader" value={TRUNCATE(s.userAddress)} />
										<div className="flex items-center gap-2 border-border-hair/60 border-t pt-2.5">
											<a
												href={`${explorer}/tx/${s.txHash}`}
												target="_blank"
												rel="noopener noreferrer"
												className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border-hair bg-bg-elevated px-3 py-1.5 text-[11px] text-text-secondary transition-colors hover:border-gold/40 hover:text-gold"
											>
												View transaction
												<ExternalLinkIcon className="size-3" />
											</a>
										</div>
									</div>
								)}
							</li>
						);
					})}
				</ul>
			)}
		</div>
	);
}

function DetailRow({ label, value, accent }: { label: string; value: string; accent?: "gold" }) {
	return (
		<div className="flex items-center justify-between gap-3">
			<span className="text-text-tertiary uppercase tracking-[0.1em]">{label}</span>
			<span className={cn("text-text-primary", accent === "gold" && "text-gold")}>{value}</span>
		</div>
	);
}
