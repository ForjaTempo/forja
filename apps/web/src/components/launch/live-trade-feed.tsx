"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import type { LaunchTradeRow } from "@/actions/launches";
import { Skeleton } from "@/components/ui/skeleton";
import { TIP20_DECIMALS } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

interface LiveTradeFeedProps {
	trades: LaunchTradeRow[];
	total: number;
	isLoading: boolean;
	tokenSymbol: string;
	maxVisible?: number;
}

function formatAmount(raw: string): string {
	const n = Number(BigInt(raw)) / 10 ** TIP20_DECIMALS;
	if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
	if (n >= 1_000) return `${(n / 1_000).toFixed(2)}K`;
	return n.toFixed(2);
}

function shortenAddress(addr: string): string {
	return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function tradeId(t: LaunchTradeRow): string {
	return `${t.txHash}-${t.logIndex}`;
}

export function LiveTradeFeed({
	trades,
	total,
	isLoading,
	tokenSymbol,
	maxVisible = 20,
}: LiveTradeFeedProps) {
	const visible = trades.slice(0, maxVisible);
	const knownIdsRef = useRef<Set<string>>(new Set());
	const [flashIds, setFlashIds] = useState<Set<string>>(new Set());

	// Track newly appearing trades (only flash when feed grows, not on initial load)
	useEffect(() => {
		if (visible.length === 0) return;

		const currentIds = new Set(visible.map(tradeId));
		if (knownIdsRef.current.size === 0) {
			// initial load — just seed known ids, no flash
			knownIdsRef.current = currentIds;
			return;
		}

		const newIds = new Set<string>();
		for (const id of currentIds) {
			if (!knownIdsRef.current.has(id)) newIds.add(id);
		}

		if (newIds.size > 0) {
			setFlashIds(newIds);
			const timer = setTimeout(() => setFlashIds(new Set()), 1200);
			knownIdsRef.current = currentIds;
			return () => clearTimeout(timer);
		}
		knownIdsRef.current = currentIds;
	}, [visible]);

	return (
		<div className="overflow-hidden rounded-2xl border border-border-hair bg-bg-elevated">
			<div className="flex items-center justify-between border-border-hair border-b px-5 py-4">
				<div className="font-display text-[16px] tracking-[-0.01em]">
					Recent trades
					<span className="ml-2 font-mono text-[12px] text-text-tertiary">
						{total.toLocaleString()}
					</span>
				</div>
				<span
					aria-hidden
					className="size-1.5 animate-[ember-flicker_2s_ease-in-out_infinite] rounded-full bg-green shadow-[0_0_6px_var(--color-green)]"
				/>
			</div>
			<div className="px-5 py-2">
				{isLoading && visible.length === 0 ? (
					<div className="space-y-2 py-3">
						{Array.from({ length: 5 }).map((_, i) => (
							<Skeleton key={`trade-skel-${i.toString()}`} className="h-10 rounded-lg" />
						))}
					</div>
				) : visible.length === 0 ? (
					<p className="py-10 text-center font-mono text-[12px] text-text-tertiary uppercase tracking-[0.14em]">
						No trades yet
					</p>
				) : (
					<div className="overflow-x-auto">
						<table className="w-full text-[12.5px]">
							<thead>
								<tr className="font-mono text-[10px] text-text-tertiary uppercase tracking-[0.12em]">
									<th className="py-2.5 text-left">Side</th>
									<th className="py-2.5 text-left">Amount</th>
									<th className="py-2.5 text-left">USDC</th>
									<th className="py-2.5 text-left">Trader</th>
									<th className="py-2.5 text-right">Time</th>
								</tr>
							</thead>
							<tbody>
								<AnimatePresence initial={false}>
									{visible.map((trade) => {
										const id = tradeId(trade);
										const isFlash = flashIds.has(id);
										const isBuy = trade.type === "buy";
										return (
											<motion.tr
												key={id}
												layout
												initial={{ opacity: 0, y: -12 }}
												animate={{ opacity: 1, y: 0 }}
												exit={{ opacity: 0 }}
												transition={{ duration: 0.25, ease: "easeOut" }}
												className={cn(
													"border-border-hair border-t transition-colors",
													isFlash && "bg-[rgba(244,114,182,0.08)]",
												)}
											>
												<td className="py-2.5">
													<span
														className={cn(
															"inline-flex items-center gap-1.5 font-medium",
															isBuy ? "text-green" : "text-red",
														)}
													>
														<span
															className={cn(
																"inline-block size-1.5 rounded-full",
																isBuy ? "bg-green" : "bg-red",
															)}
														/>
														{isBuy ? "Buy" : "Sell"}
													</span>
												</td>
												<td className="py-2.5 font-mono text-text-primary">
													{formatAmount(trade.tokenAmount)} {tokenSymbol}
												</td>
												<td className="py-2.5 font-mono text-text-secondary">
													${formatAmount(trade.usdcAmount)}
												</td>
												<td className="py-2.5 font-mono text-text-tertiary">
													{shortenAddress(trade.traderAddress)}
												</td>
												<td className="py-2.5 text-right font-mono text-text-tertiary">
													{formatDate(trade.createdAt)}
												</td>
											</motion.tr>
										);
									})}
								</AnimatePresence>
							</tbody>
						</table>
					</div>
				)}
			</div>
		</div>
	);
}
