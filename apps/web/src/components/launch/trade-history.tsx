"use client";

import type { LaunchTradeRow } from "@/actions/launches";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TIP20_DECIMALS } from "@/lib/constants";
import { formatDate } from "@/lib/format";

interface TradeHistoryProps {
	trades: LaunchTradeRow[];
	total: number;
	isLoading: boolean;
	tokenSymbol: string;
}

function formatAmount(raw: string, decimals = TIP20_DECIMALS): string {
	const n = Number(BigInt(raw)) / 10 ** decimals;
	if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
	if (n >= 1_000) return `${(n / 1_000).toFixed(2)}K`;
	return n.toFixed(2);
}

function shortenAddress(addr: string): string {
	return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function TradeHistory({ trades, total, isLoading, tokenSymbol }: TradeHistoryProps) {
	return (
		<Card className="border-anvil-gray-light bg-deep-charcoal">
			<CardHeader className="pb-2">
				<CardTitle className="text-sm text-steel-white">Recent Trades ({total})</CardTitle>
			</CardHeader>
			<CardContent>
				{isLoading && trades.length === 0 ? (
					<div className="space-y-2">
						{Array.from({ length: 5 }).map((_, i) => (
							<Skeleton key={`trade-skel-${i.toString()}`} className="h-10 rounded" />
						))}
					</div>
				) : trades.length === 0 ? (
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
								{trades.map((trade) => (
									<tr
										key={`${trade.txHash}-${trade.logIndex}`}
										className="border-b border-anvil-gray-light/50"
									>
										<td className="py-2">
											<span
												className={
													trade.type === "buy"
														? "font-medium text-emerald-400"
														: "font-medium text-red-400"
												}
											>
												{trade.type === "buy" ? "Buy" : "Sell"}
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
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
