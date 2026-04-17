"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import type { LaunchTradeRow } from "@/actions/launches";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
		<Card className="border-anvil-gray-light bg-deep-charcoal">
			<CardHeader className="pb-2">
				<CardTitle className="text-sm text-steel-white">Recent Trades ({total})</CardTitle>
			</CardHeader>
			<CardContent>
				{isLoading && visible.length === 0 ? (
					<div className="space-y-2">
						{Array.from({ length: 5 }).map((_, i) => (
							<Skeleton key={`trade-skel-${i.toString()}`} className="h-10 rounded" />
						))}
					</div>
				) : visible.length === 0 ? (
					<p className="py-8 text-center text-sm text-smoke-dark">No trades yet</p>
				) : (
					<div className="overflow-x-auto">
						<table className="w-full text-xs">
							<thead>
								<tr className="border-b border-anvil-gray-light text-smoke-dark">
									<th className="pb-2 text-left font-medium">Type</th>
									<th className="pb-2 text-left font-medium">Amount</th>
									<th className="pb-2 text-left font-medium">USDC</th>
									<th className="pb-2 text-left font-medium">Trader</th>
									<th className="pb-2 text-right font-medium">Time</th>
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
													"border-b border-anvil-gray-light/50 transition-colors",
													isFlash && "bg-indigo/10",
												)}
											>
												<td className="py-2">
													<span
														className={cn(
															"inline-flex items-center gap-1.5 font-medium",
															isBuy ? "text-emerald-400" : "text-red-400",
														)}
													>
														<span
															className={cn(
																"inline-block size-1.5 rounded-full",
																isBuy ? "bg-emerald-400" : "bg-red-400",
															)}
														/>
														{isBuy ? "Buy" : "Sell"}
													</span>
												</td>
												<td className="py-2 text-smoke">
													{formatAmount(trade.tokenAmount)} {tokenSymbol}
												</td>
												<td className="py-2 text-smoke">${formatAmount(trade.usdcAmount)}</td>
												<td className="py-2 font-mono text-smoke-dark">
													{shortenAddress(trade.traderAddress)}
												</td>
												<td className="py-2 text-right text-smoke-dark">
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
			</CardContent>
		</Card>
	);
}
