"use client";

import type { Lock } from "@forja/db";
import { DownloadIcon, ExternalLinkIcon, LockIcon } from "lucide-react";
import Link from "next/link";
import { AddressDisplay } from "@/components/ui/address-display";
import { EmptyState } from "@/components/ui/empty-state";
import { useExplorerUrl } from "@/hooks/use-explorer-url";
import { exportToCsv } from "@/lib/csv-export";
import { formatDate, formatSupply } from "@/lib/format";
import { formatDuration } from "@/lib/lock-utils";

interface LockHistoryProps {
	locks: Lock[];
}

export function LockHistory({ locks }: LockHistoryProps) {
	const explorerUrl = useExplorerUrl();

	if (locks.length === 0) {
		return (
			<EmptyState
				icon={<LockIcon className="size-8" />}
				title="No locks created"
				description="Lock tokens with vesting schedules to build trust with your community."
				action={
					<Link
						href="/lock"
						className="inline-flex items-center gap-2 rounded-xl border border-border-hair bg-bg-elevated px-5 py-3 font-medium text-[13px] text-text-secondary transition-colors hover:border-border-subtle hover:text-text-primary"
					>
						Create a lock
					</Link>
				}
			/>
		);
	}

	function handleExport() {
		exportToCsv(
			locks.map((lock) => {
				const durationSec = Math.floor(
					(new Date(lock.endTime).getTime() - new Date(lock.startTime).getTime()) / 1000,
				);
				return {
					lockId: lock.lockId,
					token: lock.tokenAddress,
					beneficiary: lock.beneficiaryAddress,
					totalAmount: lock.totalAmount,
					claimedAmount: lock.claimedAmount,
					cliff: lock.cliffDuration > 0 ? formatDuration(BigInt(lock.cliffDuration)) : "None",
					duration: formatDuration(BigInt(durationSec)),
					status: lock.revoked
						? "Revoked"
						: new Date(lock.endTime) < new Date()
							? "Ended"
							: "Active",
					endDate: formatDate(lock.endTime),
					txHash: lock.txHash,
				};
			}),
			"forja-locks",
		);
	}

	return (
		<div className="rounded-2xl border border-border-hair bg-bg-elevated">
			<div className="flex items-center justify-between px-5 py-4">
				<div className="font-mono text-[10px] text-text-tertiary uppercase tracking-[0.14em]">
					{locks.length} {locks.length === 1 ? "lock" : "locks"}
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
							<th className="py-2.5 pr-4 text-left font-medium">Beneficiary</th>
							<th className="py-2.5 pr-4 text-left font-medium">Amount</th>
							<th className="py-2.5 pr-4 text-left font-medium">Cliff</th>
							<th className="py-2.5 pr-4 text-left font-medium">Duration</th>
							<th className="py-2.5 pr-4 text-left font-medium">Progress</th>
							<th className="py-2.5 pr-4 text-left font-medium">Status</th>
							<th className="py-2.5 pr-4 text-left font-medium">End</th>
							<th className="py-2.5 pr-5 text-left font-medium">Tx</th>
						</tr>
					</thead>
					<tbody>
						{locks.map((lock) => {
							const isRevoked = lock.revoked;
							const isExpired = new Date(lock.endTime) < new Date();
							const status = isRevoked ? "Revoked" : isExpired ? "Ended" : "Active";
							const statusColor = isRevoked
								? "text-red"
								: isExpired
									? "text-text-tertiary"
									: "text-green";

							const total = BigInt(lock.totalAmount);

							const now = Date.now();
							const start = new Date(lock.startTime).getTime();
							const end = new Date(lock.endTime).getTime();
							const cliffEnd = start + lock.cliffDuration * 1000;
							let progressPct = 0;
							if (lock.revoked) {
								progressPct = 0;
							} else if (now < cliffEnd) {
								progressPct = 0;
							} else if (!lock.vestingEnabled) {
								progressPct = now >= end ? 100 : 0;
							} else if (now >= end) {
								progressPct = 100;
							} else {
								progressPct = Math.min(100, Math.floor(((now - start) / (end - start)) * 100));
							}

							const durationSec = Math.floor((end - start) / 1000);

							return (
								<tr key={lock.txHash} className="border-border-hair border-t">
									<td className="py-2.5 pr-4 pl-5">
										<AddressDisplay address={lock.tokenAddress} />
									</td>
									<td className="py-2.5 pr-4">
										<AddressDisplay address={lock.beneficiaryAddress} />
									</td>
									<td className="py-2.5 pr-4 font-mono text-[12px] text-text-primary">
										{formatSupply(total)}
									</td>
									<td className="py-2.5 pr-4 font-mono text-[12px] text-text-tertiary">
										{lock.cliffDuration > 0 ? formatDuration(BigInt(lock.cliffDuration)) : "None"}
									</td>
									<td className="py-2.5 pr-4 font-mono text-[12px] text-text-tertiary">
										{formatDuration(BigInt(durationSec))}
									</td>
									<td className="py-2.5 pr-4">
										<div className="flex items-center gap-2">
											<div className="h-1.5 w-20 overflow-hidden rounded-full bg-bg-field">
												<div
													className="h-full rounded-full transition-all duration-500"
													style={{
														width: `${progressPct}%`,
														background:
															"linear-gradient(90deg, rgba(129,140,248,0.9), rgba(129,140,248,0.5))",
													}}
												/>
											</div>
											<span className="font-mono text-[11px] text-text-tertiary">
												{progressPct}%
											</span>
										</div>
									</td>
									<td className="py-2.5 pr-4">
										<span
											className={`inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.1em] ${statusColor}`}
										>
											<LockIcon className="size-3" />
											{status}
										</span>
									</td>
									<td className="py-2.5 pr-4 font-mono text-[12px] text-text-tertiary">
										{formatDate(lock.endTime)}
									</td>
									<td className="py-2.5 pr-5">
										<a
											href={`${explorerUrl}/tx/${lock.txHash}`}
											target="_blank"
											rel="noopener noreferrer"
											className="inline-flex items-center gap-1 font-mono text-[12px] text-text-secondary transition-colors hover:text-gold"
										>
											{`${lock.txHash.slice(0, 6)}…${lock.txHash.slice(-4)}`}
											<ExternalLinkIcon className="size-3" />
										</a>
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>
		</div>
	);
}
