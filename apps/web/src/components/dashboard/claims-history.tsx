"use client";

import Link from "next/link";
import { formatUnits } from "viem";
import type { ClaimCampaignRow } from "@/actions/claims";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TIP20_DECIMALS } from "@/lib/constants";
import { formatDate } from "@/lib/format";

interface ClaimsHistoryProps {
	campaigns: ClaimCampaignRow[];
}

function formatAmount(raw: string, decimals: number = TIP20_DECIMALS): string {
	try {
		const formatted = formatUnits(BigInt(raw), decimals);
		const num = Number(formatted);
		if (!Number.isFinite(num)) return formatted;
		if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
		if (num >= 1_000) return `${(num / 1_000).toFixed(2)}K`;
		return num.toLocaleString(undefined, { maximumFractionDigits: 4 });
	} catch {
		return raw;
	}
}

export function ClaimsHistory({ campaigns }: ClaimsHistoryProps) {
	if (campaigns.length === 0) {
		return (
			<Card>
				<CardContent className="py-10 text-center text-sm text-smoke-dark">
					No claim campaigns yet.{" "}
					<Link href="/claim/create" className="text-indigo underline">
						Create one
					</Link>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="grid gap-3 sm:grid-cols-2">
			{campaigns.map((c) => {
				const claimedPct =
					c.recipientCount > 0
						? Math.min(100, Math.round((c.claimedCount / c.recipientCount) * 100))
						: 0;
				const status = c.swept
					? "Swept"
					: c.endTime && new Date(c.endTime).getTime() < Date.now()
						? "Ended"
						: "Active";
				return (
					<Card key={c.id}>
						<CardContent className="space-y-3 py-5">
							<div className="flex items-start justify-between gap-2">
								<div className="min-w-0 flex-1">
									<Link
										href={`/claim/${c.slug}`}
										className="block truncate font-semibold text-foreground hover:text-indigo"
									>
										{c.title}
									</Link>
									<p className="truncate text-xs text-smoke-dark">/claim/{c.slug}</p>
								</div>
								<span
									className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
										status === "Active"
											? "bg-emerald-500/10 text-emerald-500"
											: status === "Ended"
												? "bg-amber-500/10 text-amber-500"
												: "bg-smoke-dark/10 text-smoke-dark"
									}`}
								>
									{status}
								</span>
							</div>

							<div className="grid grid-cols-2 gap-2 text-xs">
								<div>
									<div className="text-smoke-dark">Recipients</div>
									<div className="font-medium text-foreground">
										{c.recipientCount.toLocaleString()}
									</div>
								</div>
								<div>
									<div className="text-smoke-dark">Claimed</div>
									<div className="font-medium text-foreground">
										{c.claimedCount.toLocaleString()}
									</div>
								</div>
								<div>
									<div className="text-smoke-dark">Deposited</div>
									<div className="font-medium text-foreground">
										{formatAmount(c.totalDeposited)}
									</div>
								</div>
								<div>
									<div className="text-smoke-dark">Created</div>
									<div className="font-medium text-foreground">{formatDate(c.createdAt)}</div>
								</div>
							</div>

							<div className="space-y-1">
								<div className="flex justify-between text-[10px] text-smoke-dark">
									<span>Progress</span>
									<span>{claimedPct}%</span>
								</div>
								<Progress value={claimedPct} />
							</div>
						</CardContent>
					</Card>
				);
			})}
		</div>
	);
}
