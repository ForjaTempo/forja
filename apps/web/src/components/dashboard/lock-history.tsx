"use client";

import type { Lock } from "@forja/db";
import { DownloadIcon, ExternalLinkIcon, LockIcon } from "lucide-react";
import { AddressDisplay } from "@/components/ui/address-display";
import { Progress } from "@/components/ui/progress";
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
			<div className="py-12 text-center">
				<p className="text-sm text-smoke-dark">No locks created</p>
			</div>
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
							<th className="pb-2 pr-4 font-medium">Beneficiary</th>
							<th className="pb-2 pr-4 font-medium">Amount</th>
							<th className="pb-2 pr-4 font-medium">Cliff</th>
							<th className="pb-2 pr-4 font-medium">Duration</th>
							<th className="pb-2 pr-4 font-medium">Progress</th>
							<th className="pb-2 pr-4 font-medium">Status</th>
							<th className="pb-2 pr-4 font-medium">End Date</th>
							<th className="pb-2 font-medium">Tx</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-anvil-gray-light/50">
						{locks.map((lock) => {
							const isRevoked = lock.revoked;
							const isExpired = new Date(lock.endTime) < new Date();
							const status = isRevoked ? "Revoked" : isExpired ? "Ended" : "Active";
							const statusColor = isRevoked
								? "text-red-400"
								: isExpired
									? "text-smoke-dark"
									: "text-emerald-400";

							const total = BigInt(lock.totalAmount);

							// Vesting progress: time-based (mirrors contract _getVestedAmount logic)
							const now = Date.now();
							const start = new Date(lock.startTime).getTime();
							const end = new Date(lock.endTime).getTime();
							const cliffEnd = start + lock.cliffDuration * 1000;
							let progressPct = 0;
							if (lock.revoked) {
								progressPct = 0;
							} else if (now >= end) {
								progressPct = 100;
							} else if (now < cliffEnd) {
								progressPct = 0;
							} else {
								progressPct = Math.min(100, Math.floor(((now - start) / (end - start)) * 100));
							}

							const durationSec = Math.floor((end - start) / 1000);

							return (
								<tr key={lock.txHash} className="text-smoke">
									<td className="py-2.5 pr-4">
										<AddressDisplay address={lock.tokenAddress} />
									</td>
									<td className="py-2.5 pr-4">
										<AddressDisplay address={lock.beneficiaryAddress} />
									</td>
									<td className="py-2.5 pr-4 font-mono text-xs">{formatSupply(total)}</td>
									<td className="py-2.5 pr-4 text-xs text-smoke-dark">
										{lock.cliffDuration > 0 ? formatDuration(BigInt(lock.cliffDuration)) : "None"}
									</td>
									<td className="py-2.5 pr-4 text-xs text-smoke-dark">
										{formatDuration(BigInt(durationSec))}
									</td>
									<td className="py-2.5 pr-4">
										<div className="flex items-center gap-2">
											<Progress
												value={progressPct}
												className="h-1.5 w-16 bg-anvil-gray-light [&>div]:bg-emerald-400"
											/>
											<span className="font-mono text-xs text-smoke-dark">{progressPct}%</span>
										</div>
									</td>
									<td className="py-2.5 pr-4">
										<span className={`inline-flex items-center gap-1 text-xs ${statusColor}`}>
											<LockIcon className="size-3" />
											{status}
										</span>
									</td>
									<td className="py-2.5 pr-4 text-xs text-smoke-dark">
										{formatDate(lock.endTime)}
									</td>
									<td className="py-2.5">
										<a
											href={`${explorerUrl}/tx/${lock.txHash}`}
											target="_blank"
											rel="noopener noreferrer"
											className="inline-flex items-center gap-1 font-mono text-xs text-smoke transition-colors hover:text-molten-amber"
										>
											{`${lock.txHash.slice(0, 6)}...${lock.txHash.slice(-4)}`}
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
