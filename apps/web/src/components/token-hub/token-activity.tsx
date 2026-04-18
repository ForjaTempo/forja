"use client";

import type { TokenTransfer } from "@forja/db";
import { ExternalLinkIcon } from "lucide-react";
import { AddressDisplay } from "@/components/ui/address-display";
import { useExplorerUrl } from "@/hooks/use-explorer-url";
import { formatDate, formatSupply } from "@/lib/format";

interface TokenActivityProps {
	transfers: TokenTransfer[];
	total: number;
	isLoading: boolean;
	hasMore: boolean;
	onLoadMore: () => void;
}

export function TokenActivity({
	transfers,
	total,
	isLoading,
	hasMore,
	onLoadMore,
}: TokenActivityProps) {
	const explorerUrl = useExplorerUrl();

	if (transfers.length === 0 && !isLoading) {
		return (
			<div className="rounded-2xl border border-border-hair bg-bg-elevated py-12 text-center">
				<p className="text-[13px] text-text-tertiary">No transfer history.</p>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<div className="rounded-2xl border border-border-hair bg-bg-elevated">
				<div className="overflow-x-auto">
					<table className="w-full text-[13px]">
						<thead>
							<tr className="font-mono text-[10px] text-text-tertiary uppercase tracking-[0.12em]">
								<th className="py-2.5 pr-4 pl-5 text-left font-medium">From</th>
								<th className="py-2.5 pr-4 text-left font-medium">To</th>
								<th className="py-2.5 pr-4 text-left font-medium">Amount</th>
								<th className="py-2.5 pr-4 text-left font-medium">Date</th>
								<th className="py-2.5 pr-5 text-left font-medium">Tx</th>
							</tr>
						</thead>
						<tbody>
							{transfers.map((tx) => (
								<tr key={`${tx.txHash}-${tx.logIndex}`} className="border-border-hair border-t">
									<td className="py-2.5 pr-4 pl-5">
										<AddressDisplay address={tx.fromAddress} />
									</td>
									<td className="py-2.5 pr-4">
										<AddressDisplay address={tx.toAddress} />
									</td>
									<td className="py-2.5 pr-4 font-mono text-[12px] text-text-primary">
										{formatSupply(BigInt(tx.amount))}
									</td>
									<td className="py-2.5 pr-4 font-mono text-[12px] text-text-tertiary">
										{formatDate(tx.createdAt)}
									</td>
									<td className="py-2.5 pr-5">
										<a
											href={`${explorerUrl}/tx/${tx.txHash}`}
											target="_blank"
											rel="noopener noreferrer"
											className="inline-flex items-center gap-1 font-mono text-[12px] text-text-secondary transition-colors hover:text-gold"
										>
											{`${tx.txHash.slice(0, 6)}…${tx.txHash.slice(-4)}`}
											<ExternalLinkIcon className="size-3" />
										</a>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>

			{hasMore && (
				<div className="flex justify-center">
					<button
						type="button"
						onClick={onLoadMore}
						disabled={isLoading}
						className="inline-flex items-center gap-2 rounded-xl border border-border-hair bg-bg-elevated px-4 py-2 font-medium text-[12px] text-text-secondary transition-colors hover:border-border-subtle hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-60"
					>
						{isLoading
							? "Loading…"
							: `Load more · ${transfers.length} of ${total.toLocaleString()}`}
					</button>
				</div>
			)}
		</div>
	);
}
