import { formatUnits } from "viem";
import type { CampaignStats } from "@/actions/claims";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

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
			<Card>
				<CardContent className="py-6 text-center text-sm text-smoke-dark">
					Stats unavailable.
				</CardContent>
			</Card>
		);
	}

	const claimedPct =
		stats.recipientCount > 0
			? Math.min(100, Math.round((stats.claimedCount / stats.recipientCount) * 100))
			: 0;

	const sym = tokenSymbol ?? "";

	return (
		<Card>
			<CardContent className="space-y-4 py-6">
				<div className="grid grid-cols-3 gap-4">
					<div>
						<div className="text-xs text-smoke-dark">Total deposited</div>
						<div className="text-lg font-semibold text-foreground">
							{formatAmount(stats.totalDeposited, decimals)} {sym}
						</div>
					</div>
					<div>
						<div className="text-xs text-smoke-dark">Total claimed</div>
						<div className="text-lg font-semibold text-foreground">
							{formatAmount(stats.totalClaimed, decimals)} {sym}
						</div>
					</div>
					<div>
						<div className="text-xs text-smoke-dark">Remaining</div>
						<div className="text-lg font-semibold text-foreground">
							{formatAmount(stats.remaining, decimals)} {sym}
						</div>
					</div>
				</div>
				<div className="space-y-1.5">
					<div className="flex items-center justify-between text-xs text-smoke-dark">
						<span>
							{stats.claimedCount.toLocaleString()} / {stats.recipientCount.toLocaleString()}{" "}
							recipients claimed
						</span>
						<span>{claimedPct}%</span>
					</div>
					<Progress value={claimedPct} />
				</div>
				{sweepEnabled && (
					<div className="text-xs text-smoke-dark">
						{swept
							? "Unclaimed tokens were swept by the creator."
							: "Unclaimed tokens may be swept by the creator after the end date."}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
