"use client";

import type { TokenTransfer } from "@forja/db";
import { ExternalLinkIcon } from "lucide-react";
import { AddressDisplay } from "@/components/ui/address-display";
import { Button } from "@/components/ui/button";
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
			<div className="py-12 text-center">
				<p className="text-sm text-smoke-dark">No transfer history</p>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<div className="overflow-x-auto">
				<table className="w-full text-sm">
					<thead>
						<tr className="border-b border-anvil-gray-light text-left text-xs text-smoke-dark">
							<th className="pb-2 pr-4 font-medium">From</th>
							<th className="pb-2 pr-4 font-medium">To</th>
							<th className="pb-2 pr-4 font-medium">Amount</th>
							<th className="pb-2 pr-4 font-medium">Date</th>
							<th className="pb-2 font-medium">Tx</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-anvil-gray-light/50">
						{transfers.map((tx) => (
							<tr key={`${tx.txHash}-${tx.logIndex}`} className="text-smoke">
								<td className="py-2.5 pr-4">
									<AddressDisplay address={tx.fromAddress} />
								</td>
								<td className="py-2.5 pr-4">
									<AddressDisplay address={tx.toAddress} />
								</td>
								<td className="py-2.5 pr-4 font-mono text-xs">{formatSupply(BigInt(tx.amount))}</td>
								<td className="py-2.5 pr-4 text-xs text-smoke-dark">{formatDate(tx.createdAt)}</td>
								<td className="py-2.5">
									<a
										href={`${explorerUrl}/tx/${tx.txHash}`}
										target="_blank"
										rel="noopener noreferrer"
										className="inline-flex items-center gap-1 font-mono text-xs text-smoke transition-colors hover:text-molten-amber"
									>
										{`${tx.txHash.slice(0, 6)}...${tx.txHash.slice(-4)}`}
										<ExternalLinkIcon className="size-3" />
									</a>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>

			{hasMore && (
				<div className="flex justify-center">
					<Button
						variant="outline"
						size="sm"
						onClick={onLoadMore}
						disabled={isLoading}
						className="border-anvil-gray-light text-smoke"
					>
						{isLoading ? "Loading..." : `Load More (${transfers.length} of ${total})`}
					</Button>
				</div>
			)}
		</div>
	);
}
