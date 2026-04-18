import { formatUnits } from "viem";
import type { CampaignStats } from "@/actions/claims";

interface ClaimStatsProps {
	stats: CampaignStats | null | undefined;
	decimals: number;
	tokenSymbol: string | undefined;
	sweepEnabled: boolean;
	swept: boolean;
}

function formatAmount(raw: string, decimals: number): string {
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

export function ClaimStats({ stats, decimals, tokenSymbol, sweepEnabled, swept }: ClaimStatsProps) {
	if (!stats) {
		return (
			<div className="rounded-2xl border border-border-hair bg-bg-elevated p-6 text-center text-[13px] text-text-tertiary">
				Stats unavailable.
			</div>
		);
	}

	const claimedPct =
		stats.recipientCount > 0
			? Math.min(100, Math.round((stats.claimedCount / stats.recipientCount) * 100))
			: 0;

	const sym = tokenSymbol ?? "";

	return (
		<div className="space-y-5 rounded-2xl border border-border-hair bg-bg-elevated p-6">
			<div className="grid grid-cols-3 gap-4">
				<div>
					<div className="font-mono text-[10px] text-text-tertiary uppercase tracking-[0.12em]">
						Deposited
					</div>
					<div className="mt-1 font-display text-[20px] tracking-[-0.01em] text-text-primary">
						{formatAmount(stats.totalDeposited, decimals)} {sym}
					</div>
				</div>
				<div>
					<div className="font-mono text-[10px] text-text-tertiary uppercase tracking-[0.12em]">
						Claimed
					</div>
					<div className="mt-1 font-display text-[20px] tracking-[-0.01em] text-green">
						{formatAmount(stats.totalClaimed, decimals)} {sym}
					</div>
				</div>
				<div>
					<div className="font-mono text-[10px] text-text-tertiary uppercase tracking-[0.12em]">
						Remaining
					</div>
					<div className="mt-1 font-display text-[20px] tracking-[-0.01em] text-text-primary">
						{formatAmount(stats.remaining, decimals)} {sym}
					</div>
				</div>
			</div>

			<div className="space-y-2">
				<div className="flex items-center justify-between font-mono text-[10px] text-text-tertiary uppercase tracking-[0.12em]">
					<span>
						{stats.claimedCount.toLocaleString()} / {stats.recipientCount.toLocaleString()} claimed
					</span>
					<span className="text-text-secondary">{claimedPct}%</span>
				</div>
				<div className="h-2 w-full overflow-hidden rounded-full bg-bg-field">
					<div
						className="h-full rounded-full transition-all duration-500"
						style={{
							width: `${claimedPct}%`,
							background: "linear-gradient(90deg, rgba(255,107,61,0.9), rgba(255,107,61,0.5))",
						}}
					/>
				</div>
			</div>

			{sweepEnabled && (
				<p className="border-border-hair border-t pt-3 text-[12px] text-text-tertiary">
					{swept
						? "Unclaimed tokens were swept by the creator."
						: "Unclaimed tokens may be swept by the creator after the end date."}
				</p>
			)}
		</div>
	);
}
