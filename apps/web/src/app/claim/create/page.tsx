"use client";

import { useSearchParams } from "next/navigation";
import { ClaimCampaignForm } from "@/components/claim/claim-campaign-form";
import { CursorGlow } from "@/components/shared/cursor-glow";
import { ToolHero, ToolStat, ToolStatBar, ToolStatDivider } from "@/components/shared/tool-hero";
import { useReveal } from "@/components/shared/use-reveal";
import { Card, CardContent } from "@/components/ui/card";
import { hasClaimer } from "@/lib/contracts";

export default function CreateClaimCampaignPage() {
	useReveal();
	const searchParams = useSearchParams();
	const initialToken = searchParams.get("token") ?? "";

	return (
		<div className="noise relative min-h-screen overflow-hidden bg-bg-page">
			<CursorGlow color="rgba(255,107,61,0.06)" size={520} />

			<div className="pointer-events-none absolute inset-0 z-0">
				<div
					className="absolute top-[10%] right-[-15%] h-[700px] w-[700px] rounded-full"
					style={{
						background: "radial-gradient(circle, rgba(255,107,61,0.10) 0%, transparent 55%)",
						filter: "blur(60px)",
					}}
				/>
				<div
					className="absolute bottom-[10%] left-[-10%] h-[500px] w-[500px] rounded-full"
					style={{
						background: "radial-gradient(circle, rgba(240,211,138,0.06) 0%, transparent 55%)",
						filter: "blur(60px)",
					}}
				/>
			</div>

			<main className="relative z-[5] mx-auto max-w-[1400px] px-6 pt-16 pb-20 sm:px-10 sm:pt-20 sm:pb-24">
				<ToolHero
					number="/04"
					label="Claim · Merkle airdrops"
					accent="ember"
					title={
						<span>
							A million wallets.
							<br />
							<span className="ember-text italic">One root hash.</span>
						</span>
					}
					description="Merkle-proof airdrops scale to millions of recipients without paying per-address gas. You deposit once. They claim when ready. Unclaimed funds return to you after expiry."
					aside={
						<ToolStatBar>
							<ToolStat label="Recipients" value="∞" unit="merkle" accent="ember" />
							<ToolStatDivider />
							<ToolStat label="Your cost" value="2" unit="USDC" accent="gold" />
							<ToolStatDivider />
							<ToolStat label="Gas per claim" value="~$0.01" accent="green" />
						</ToolStatBar>
					}
					className="mb-12"
				/>

				<div className="reveal mx-auto max-w-3xl">
					{hasClaimer ? (
						<ClaimCampaignForm initialToken={initialToken} />
					) : (
						<Card className="border-border-hair bg-bg-card">
							<CardContent className="space-y-2 py-12 text-center">
								<p className="font-display text-3xl text-text-primary">Coming soon</p>
								<p className="text-sm text-text-secondary">
									Merkle claim campaigns are not yet available on this network.
								</p>
							</CardContent>
						</Card>
					)}
				</div>
			</main>
		</div>
	);
}
