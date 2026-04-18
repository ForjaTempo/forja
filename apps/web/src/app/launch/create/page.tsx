"use client";

import { LaunchCreateForm } from "@/components/launch/launch-create-form";
import { CursorGlow } from "@/components/shared/cursor-glow";
import { ToolHero } from "@/components/shared/tool-hero";
import { useReveal } from "@/components/shared/use-reveal";
import { FEES } from "@/lib/constants";

export default function LaunchCreatePage() {
	useReveal();

	return (
		<div className="noise relative min-h-screen overflow-hidden bg-bg-page">
			<CursorGlow color="rgba(244,114,182,0.06)" size={520} />

			<div className="pointer-events-none absolute inset-0 z-0">
				<div
					className="absolute top-[10%] right-[-15%] h-[700px] w-[700px] rounded-full"
					style={{
						background: "radial-gradient(circle, rgba(244,114,182,0.08) 0%, transparent 55%)",
						filter: "blur(60px)",
					}}
				/>
				<div
					className="absolute bottom-[10%] left-[-10%] h-[500px] w-[500px] rounded-full"
					style={{
						background: "radial-gradient(circle, rgba(167,139,250,0.06) 0%, transparent 55%)",
						filter: "blur(60px)",
					}}
				/>
			</div>

			<main className="relative z-[5] mx-auto max-w-[1400px] px-6 pt-16 pb-20 sm:px-10 sm:pt-20 sm:pb-24">
				<ToolHero
					number="/05"
					label="Launchpad · Create a new launch"
					accent="ember"
					title={
						<span>
							<span>Price discovery,</span>
							<br />
							<span
								style={{
									fontStyle: "italic",
									background: "linear-gradient(135deg, #f472b6, #a78bfa)",
									WebkitBackgroundClip: "text",
									backgroundClip: "text",
									WebkitTextFillColor: "transparent",
								}}
							>
								by math.
							</span>
						</span>
					}
					description="Launch a token on a bonding curve. Every buy raises the price, every sell lowers it. At $69,000 raised, liquidity migrates to Uniswap v4 and trading continues there — no team unlocks, no surprises."
					className="mb-12"
				/>

				<div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px]">
					<div className="reveal rounded-2xl border border-border-hair bg-bg-elevated p-6 sm:p-8">
						<LaunchCreateForm />
					</div>

					<aside className="reveal space-y-4">
						<InfoCard
							eyebrow="Graduation"
							title="What happens at $69k"
							body="Once the bonding curve reaches $69,000 raised, the remaining tokens + liquidity seed a Uniswap v4 pool. Trading continues there with a transparent 0.25% fee."
						/>
						<InfoCard
							eyebrow="Fees"
							title="Bond fee breakdown"
							body={
								<>
									<FeeRow label="Creation" value={`${FEES.launchCreate} USDC`} />
									<FeeRow label="Trading" value="1% per swap" />
									<FeeRow label="Creator cut" value="0.5% of trades" />
									<FeeRow label="Graduation fee" value="Auto to LP" />
								</>
							}
						/>
						<InfoCard
							eyebrow="Safety"
							title="Caps + safety rails"
							body={
								<>
									<FeeRow label="Max single buy" value="5,000 USDC" />
									<FeeRow label="Min single buy" value="1 USDC" />
									<FeeRow label="Timeout" value="30 days" />
									<FeeRow label="Curve supply" value="800M (80%)" />
								</>
							}
						/>
					</aside>
				</div>
			</main>
		</div>
	);
}

function InfoCard({
	eyebrow,
	title,
	body,
}: {
	eyebrow: string;
	title: string;
	body: React.ReactNode;
}) {
	return (
		<div className="rounded-2xl border border-border-hair bg-bg-elevated p-5">
			<div
				className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em]"
				style={{ color: "#f472b6" }}
			>
				{eyebrow}
			</div>
			<div className="mb-3 font-display text-[20px] leading-[1.2] tracking-[-0.02em] text-text-primary">
				{title}
			</div>
			{typeof body === "string" ? (
				<p className="text-sm leading-[1.6] text-text-secondary">{body}</p>
			) : (
				<div className="space-y-1.5">{body}</div>
			)}
		</div>
	);
}

function FeeRow({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex items-center justify-between">
			<span className="font-mono text-[11px] uppercase tracking-[0.1em] text-text-tertiary">
				{label}
			</span>
			<span className="font-mono text-xs text-text-secondary">{value}</span>
		</div>
	);
}
