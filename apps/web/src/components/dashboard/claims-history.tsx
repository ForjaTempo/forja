"use client";

import { GiftIcon } from "lucide-react";
import Link from "next/link";
import { formatUnits } from "viem";
import type { ClaimCampaignRow } from "@/actions/claims";
import { EmptyState } from "@/components/ui/empty-state";
import { TIP20_DECIMALS } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

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
			<EmptyState
				icon={<GiftIcon className="size-8" />}
				title="No claim campaigns yet"
				description="Run Merkle-based token claims for your community."
				action={
					<Link
						href="/claim/create"
						className="inline-flex items-center gap-2 rounded-xl border border-border-hair bg-bg-elevated px-5 py-3 font-medium text-[13px] text-text-secondary transition-colors hover:border-border-subtle hover:text-text-primary"
					>
						Forge a campaign
					</Link>
				}
			/>
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
					<div
						key={c.id}
						className="space-y-3 rounded-2xl border border-border-hair bg-bg-elevated p-5 transition-colors hover:border-border-subtle"
					>
						<div className="flex items-start justify-between gap-2">
							<div className="min-w-0 flex-1">
								<Link
									href={`/claim/${c.slug}`}
									className="block truncate font-display text-[18px] tracking-[-0.01em] text-text-primary transition-colors hover:text-gold"
								>
									{c.title}
								</Link>
								<p className="truncate font-mono text-[11px] text-text-tertiary">/claim/{c.slug}</p>
							</div>
							<span
								className={cn(
									"inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em]",
									status === "Active"
										? "border-ember/30 bg-ember/10 text-ember"
										: status === "Ended"
											? "border-gold/30 bg-gold/10 text-gold"
											: "border-border-hair bg-bg-field text-text-tertiary",
								)}
							>
								{status}
							</span>
						</div>

						<div className="grid grid-cols-2 gap-2 text-[12px]">
							<div>
								<div className="font-mono text-[10px] text-text-tertiary uppercase tracking-[0.1em]">
									Recipients
								</div>
								<div className="mt-0.5 font-mono text-text-primary">
									{c.recipientCount.toLocaleString()}
								</div>
							</div>
							<div>
								<div className="font-mono text-[10px] text-text-tertiary uppercase tracking-[0.1em]">
									Claimed
								</div>
								<div className="mt-0.5 font-mono text-text-primary">
									{c.claimedCount.toLocaleString()}
								</div>
							</div>
							<div>
								<div className="font-mono text-[10px] text-text-tertiary uppercase tracking-[0.1em]">
									Deposited
								</div>
								<div className="mt-0.5 font-mono text-text-primary">
									{formatAmount(c.totalDeposited)}
								</div>
							</div>
							<div>
								<div className="font-mono text-[10px] text-text-tertiary uppercase tracking-[0.1em]">
									Created
								</div>
								<div className="mt-0.5 font-mono text-text-tertiary">{formatDate(c.createdAt)}</div>
							</div>
						</div>

						<div className="space-y-1.5">
							<div className="flex justify-between font-mono text-[10px] text-text-tertiary uppercase tracking-[0.12em]">
								<span>Progress</span>
								<span className="text-text-secondary">{claimedPct}%</span>
							</div>
							<div className="h-1.5 w-full overflow-hidden rounded-full bg-bg-field">
								<div
									className="h-full rounded-full transition-all duration-500"
									style={{
										width: `${claimedPct}%`,
										background:
											"linear-gradient(90deg, rgba(255,107,61,0.9), rgba(255,107,61,0.5))",
									}}
								/>
							</div>
						</div>
					</div>
				);
			})}
		</div>
	);
}
