"use client";

import type { Multisend } from "@forja/db";
import { DownloadIcon, ExternalLinkIcon, SendIcon } from "lucide-react";
import Link from "next/link";
import { AddressDisplay } from "@/components/ui/address-display";
import { EmptyState } from "@/components/ui/empty-state";
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
			<EmptyState
				icon={<SendIcon className="size-8" />}
				title="No multisend history"
				description="Distribute tokens to up to 500 addresses in a single transaction."
				action={
					<Link
						href="/multisend"
						className="inline-flex items-center gap-2 rounded-xl border border-border-hair bg-bg-elevated px-5 py-3 font-medium text-[13px] text-text-secondary transition-colors hover:border-border-subtle hover:text-text-primary"
					>
						Start a multisend
					</Link>
				}
			/>
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
		<div className="rounded-2xl border border-border-hair bg-bg-elevated">
			<div className="flex items-center justify-between px-5 py-4">
				<div className="font-mono text-[10px] text-text-tertiary uppercase tracking-[0.14em]">
					{formatter.format(multisends.length)}{" "}
					{multisends.length === 1 ? "dispatch" : "dispatches"}
				</div>
				<button
					type="button"
					onClick={handleExport}
					className="inline-flex items-center gap-1.5 rounded-lg border border-border-hair bg-bg-field px-2.5 py-1 text-[11px] font-medium text-text-secondary transition-colors hover:border-border-subtle hover:text-gold"
				>
					<DownloadIcon className="size-3" />
					Export CSV
				</button>
			</div>
			<div className="overflow-x-auto border-border-hair border-t">
				<table className="w-full text-[13px]">
					<thead>
						<tr className="font-mono text-[10px] text-text-tertiary uppercase tracking-[0.12em]">
							<th className="py-2.5 pr-4 pl-5 text-left font-medium">Token</th>
							<th className="py-2.5 pr-4 text-left font-medium">Recipients</th>
							<th className="py-2.5 pr-4 text-left font-medium">Total</th>
							<th className="py-2.5 pr-4 text-left font-medium">Date</th>
							<th className="py-2.5 pr-5 text-left font-medium">Tx</th>
						</tr>
					</thead>
					<tbody>
						{multisends.map((ms) => (
							<tr key={ms.txHash} className="border-border-hair border-t">
								<td className="py-2.5 pr-4 pl-5">
									<AddressDisplay address={ms.tokenAddress} />
								</td>
								<td className="py-2.5 pr-4 text-text-primary">
									<span className="inline-flex items-center gap-1.5">
										<SendIcon className="size-3 text-text-tertiary" />
										{formatter.format(ms.recipientCount)}
									</span>
								</td>
								<td className="py-2.5 pr-4 font-mono text-[12px] text-text-primary">
									{formatSupply(BigInt(ms.totalAmount))}
								</td>
								<td className="py-2.5 pr-4 font-mono text-[12px] text-text-tertiary">
									{formatDate(ms.createdAt)}
								</td>
								<td className="py-2.5 pr-5">
									<a
										href={`${explorerUrl}/tx/${ms.txHash}`}
										target="_blank"
										rel="noopener noreferrer"
										className="inline-flex items-center gap-1 font-mono text-[12px] text-text-secondary transition-colors hover:text-gold"
									>
										{`${ms.txHash.slice(0, 6)}…${ms.txHash.slice(-4)}`}
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
