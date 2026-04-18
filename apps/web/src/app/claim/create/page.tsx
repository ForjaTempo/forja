"use client";

import { useSearchParams } from "next/navigation";
import { ClaimCampaignForm } from "@/components/claim/claim-campaign-form";
import { CursorGlow } from "@/components/shared/cursor-glow";
import { ToolHero, ToolStat, ToolStatBar, ToolStatDivider } from "@/components/shared/tool-hero";
import { useReveal } from "@/components/shared/use-reveal";
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

				<div className="grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:items-start">
					<div className="reveal">
						{hasClaimer ? (
							<ClaimCampaignForm initialToken={initialToken} />
						) : (
							<div className="space-y-2 rounded-2xl border border-border-hair bg-bg-elevated p-12 text-center">
								<p className="font-display text-[28px] tracking-[-0.01em] text-text-primary">
									Coming soon
								</p>
								<p className="text-[13.5px] text-text-secondary">
									Merkle claim campaigns are not yet available on this network.
								</p>
							</div>
						)}
					</div>

					<aside
						className="reveal flex flex-col gap-6 lg:sticky lg:top-24"
						style={{ transitionDelay: "0.15s" }}
					>
						<div
							className="relative overflow-hidden rounded-2xl border border-border-hair p-6"
							style={{
								background:
									"radial-gradient(circle at 50% 0%, rgba(255,107,61,0.1), transparent 60%), var(--color-bg-elevated)",
							}}
						>
							<div className="mb-4 font-mono text-[10px] text-text-tertiary uppercase tracking-[0.14em]">
								How it works
							</div>
							<ol className="space-y-4 text-sm text-text-secondary">
								<li className="flex gap-3">
									<span
										className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[rgba(255,107,61,0.3)] font-mono text-[10px]"
										style={{ color: "var(--color-ember)" }}
									>
										1
									</span>
									<span>
										Paste or upload your recipient list —{" "}
										<span className="text-text-primary">address,amount</span> pairs. Up to 5,000
										wallets per campaign.
									</span>
								</li>
								<li className="flex gap-3">
									<span
										className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[rgba(255,107,61,0.3)] font-mono text-[10px]"
										style={{ color: "var(--color-ember)" }}
									>
										2
									</span>
									<span>
										Name the campaign, pick a <span className="text-text-primary">slug</span>, and
										optionally set start/end dates and a sweep-on-expiry policy.
									</span>
								</li>
								<li className="flex gap-3">
									<span
										className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[rgba(255,107,61,0.3)] font-mono text-[10px]"
										style={{ color: "var(--color-ember)" }}
									>
										3
									</span>
									<span>
										Deposit tokens once + pay the flat fee. Recipients claim their share
										permissionlessly — gas-free for you.
									</span>
								</li>
							</ol>
						</div>
					</aside>
				</div>
			</main>
		</div>
	);
}
