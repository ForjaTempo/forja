"use client";

import type { Multisend } from "@forja/db";
import { DownloadIcon, ExternalLinkIcon, SendIcon } from "lucide-react";
import { AddressDisplay } from "@/components/ui/address-display";
import { useExplorerUrl } from "@/hooks/use-explorer-url";
import { exportToCsv } from "@/lib/csv-export";
import { formatDate, formatSupply } from "@/lib/format";

const formatter = new Intl.NumberFormat("en-US");

interface MultisendHistoryProps {
	multisends: Multisend[];
}

export function MultisendHistory({ multisends }: MultisendHistoryProps) {
	const explorerUrl = useExplorerUrl();

	if (multisends.length === 0) {
		return (
			<div className="py-12 text-center">
				<p className="text-sm text-smoke-dark">No multisend history</p>
			</div>
		);
	}

	function handleExport() {
		exportToCsv(
			multisends.map((ms) => ({
				token: ms.tokenAddress,
				recipients: ms.recipientCount,
				totalAmount: ms.totalAmount,
				date: formatDate(ms.createdAt),
				txHash: ms.txHash,
			})),
			"forja-multisends",
		);
	}

	return (
		<div>
			<div className="mb-4 flex justify-end">
				<button
					type="button"
					onClick={handleExport}
					className="inline-flex items-center gap-1.5 rounded-md border border-anvil-gray-light px-3 py-1.5 text-xs text-smoke transition-colors hover:border-molten-amber hover:text-molten-amber"
				>
					<DownloadIcon className="size-3" />
					Export CSV
				</button>
			</div>
			<div className="overflow-x-auto">
				<table className="w-full text-sm">
					<thead>
						<tr className="border-b border-anvil-gray-light text-left text-xs text-smoke-dark">
							<th className="pb-2 pr-4 font-medium">Token</th>
							<th className="pb-2 pr-4 font-medium">Recipients</th>
							<th className="pb-2 pr-4 font-medium">Total Amount</th>
							<th className="pb-2 pr-4 font-medium">Date</th>
							<th className="pb-2 font-medium">Tx</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-anvil-gray-light/50">
						{multisends.map((ms) => (
							<tr key={ms.txHash} className="text-smoke">
								<td className="py-2.5 pr-4">
									<AddressDisplay address={ms.tokenAddress} />
								</td>
								<td className="py-2.5 pr-4">
									<span className="inline-flex items-center gap-1">
										<SendIcon className="size-3 text-smoke-dark" />
										{formatter.format(ms.recipientCount)}
									</span>
								</td>
								<td className="py-2.5 pr-4 font-mono text-xs">
									{formatSupply(BigInt(ms.totalAmount))}
								</td>
								<td className="py-2.5 pr-4 text-xs text-smoke-dark">{formatDate(ms.createdAt)}</td>
								<td className="py-2.5">
									<a
										href={`${explorerUrl}/tx/${ms.txHash}`}
										target="_blank"
										rel="noopener noreferrer"
										className="inline-flex items-center gap-1 font-mono text-xs text-smoke transition-colors hover:text-molten-amber"
									>
										{`${ms.txHash.slice(0, 6)}...${ms.txHash.slice(-4)}`}
										<ExternalLinkIcon className="size-3" />
									</a>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}
