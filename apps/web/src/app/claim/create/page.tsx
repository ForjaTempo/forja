"use client";

import { useSearchParams } from "next/navigation";
import { ClaimCampaignForm } from "@/components/claim/claim-campaign-form";
import { PageContainer } from "@/components/layout/page-container";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { hasClaimer } from "@/lib/contracts";

export default function CreateClaimCampaignPage() {
	const searchParams = useSearchParams();
	const initialToken = searchParams.get("token") ?? "";

	return (
		<PageContainer className="py-8 sm:py-12">
			<div className="mx-auto max-w-2xl space-y-8">
				<PageHeader
					title="Create Claim Campaign"
					description="Distribute tokens to thousands of recipients via merkle-proof airdrops."
				/>
				{hasClaimer ? (
					<ClaimCampaignForm initialToken={initialToken} />
				) : (
					<Card>
						<CardContent className="space-y-2 py-10 text-center">
							<p className="text-sm font-medium text-smoke">Coming soon</p>
							<p className="text-xs text-smoke-dark">
								Merkle claim campaigns are not yet available on this network.
							</p>
						</CardContent>
					</Card>
				)}
			</div>
		</PageContainer>
	);
}
