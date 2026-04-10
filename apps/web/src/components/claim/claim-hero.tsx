import type { ClaimCampaignRow } from "@/actions/claims";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/format";

interface ClaimHeroProps {
	campaign: ClaimCampaignRow;
	tokenSymbol: string | undefined;
}

export function ClaimHero({ campaign, tokenSymbol }: ClaimHeroProps) {
	return (
		<Card>
			<CardContent className="space-y-4 py-6">
				{campaign.bannerUrl && (
					// biome-ignore lint/performance/noImgElement: external creator-supplied banner, no Next image loader
					<img
						src={campaign.bannerUrl}
						alt={campaign.title}
						className="h-40 w-full rounded-md object-cover"
					/>
				)}
				<div className="space-y-1">
					<h1 className="text-2xl font-bold text-foreground sm:text-3xl">{campaign.title}</h1>
					{campaign.description && (
						<p className="text-sm text-smoke-dark">{campaign.description}</p>
					)}
				</div>
				<div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-smoke-dark">
					<span>
						Token: <span className="font-medium text-foreground">{tokenSymbol ?? "—"}</span>
					</span>
					<span>
						Recipients:{" "}
						<span className="font-medium text-foreground">
							{campaign.recipientCount.toLocaleString()}
						</span>
					</span>
					<span>
						Starts:{" "}
						<span className="font-medium text-foreground">{formatDate(campaign.startTime)}</span>
					</span>
					<span>
						Ends:{" "}
						<span className="font-medium text-foreground">
							{campaign.endTime ? formatDate(campaign.endTime) : "No expiry"}
						</span>
					</span>
				</div>
			</CardContent>
		</Card>
	);
}
