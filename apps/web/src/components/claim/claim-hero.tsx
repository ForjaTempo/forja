import type { ClaimCampaignRow } from "@/actions/claims";
import { formatDate } from "@/lib/format";

interface ClaimHeroProps {
	campaign: ClaimCampaignRow;
	tokenSymbol: string | undefined;
}

export function ClaimHero({ campaign, tokenSymbol }: ClaimHeroProps) {
	return (
		<div className="overflow-hidden rounded-2xl border border-border-hair bg-bg-elevated">
			{campaign.bannerUrl && (
				// biome-ignore lint/performance/noImgElement: external creator-supplied banner, no Next image loader
				<img src={campaign.bannerUrl} alt={campaign.title} className="h-44 w-full object-cover" />
			)}
			<div className="space-y-4 p-6">
				<div className="space-y-2">
					<h1 className="font-display text-[28px] leading-[1.1] tracking-[-0.02em] text-text-primary sm:text-[34px]">
						{campaign.title}
					</h1>
					{campaign.description && (
						<p className="text-[14px] text-text-secondary">{campaign.description}</p>
					)}
				</div>
				<dl className="grid grid-cols-2 gap-x-6 gap-y-2.5 border-border-hair border-t pt-4 text-[12.5px] sm:grid-cols-4">
					<div>
						<dt className="font-mono text-[10px] text-text-tertiary uppercase tracking-[0.12em]">
							Token
						</dt>
						<dd className="mt-0.5 font-mono text-text-primary">{tokenSymbol ?? "—"}</dd>
					</div>
					<div>
						<dt className="font-mono text-[10px] text-text-tertiary uppercase tracking-[0.12em]">
							Recipients
						</dt>
						<dd className="mt-0.5 font-mono text-text-primary">
							{campaign.recipientCount.toLocaleString()}
						</dd>
					</div>
					<div>
						<dt className="font-mono text-[10px] text-text-tertiary uppercase tracking-[0.12em]">
							Starts
						</dt>
						<dd className="mt-0.5 text-text-secondary">{formatDate(campaign.startTime)}</dd>
					</div>
					<div>
						<dt className="font-mono text-[10px] text-text-tertiary uppercase tracking-[0.12em]">
							Ends
						</dt>
						<dd className="mt-0.5 text-text-secondary">
							{campaign.endTime ? formatDate(campaign.endTime) : "No expiry"}
						</dd>
					</div>
				</dl>
			</div>
		</div>
	);
}
