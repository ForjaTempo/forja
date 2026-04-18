"use client";

import { motion } from "framer-motion";
import { BarChart3Icon, BellIcon, LayersIcon, type LucideIcon } from "lucide-react";
import { ConnectButton } from "@/components/layout/connect-button";
import { PageContainer } from "@/components/layout/page-container";
import { CursorGlow } from "@/components/shared/cursor-glow";
import { fadeInUp, staggerContainer } from "@/lib/motion";

interface Feature {
	icon: LucideIcon;
	title: string;
	description: string;
	accent: string;
}

const FEATURES: Feature[] = [
	{
		icon: LayersIcon,
		title: "Five tools, one view",
		description: "Tokens, multisends, locks, claims, and launches — all in one ledger.",
		accent: "var(--color-indigo)",
	},
	{
		icon: BarChart3Icon,
		title: "Analytics & insights",
		description: "Holder growth, transfer activity, and concentration signals at a glance.",
		accent: "var(--color-green)",
	},
	{
		icon: BellIcon,
		title: "Watchlist & alerts",
		description: "Track tokens you care about and get pinged when they move.",
		accent: "var(--color-gold)",
	},
];

export function NotConnectedHero() {
	return (
		<PageContainer className="py-16 sm:py-24">
			<CursorGlow color="rgba(129,140,248,0.06)" size={520} />
			<div className="mx-auto max-w-4xl space-y-14 text-center">
				<motion.div initial="hidden" animate="visible" variants={fadeInUp} className="space-y-4">
					<div className="inline-flex items-center gap-2.5 rounded-full border border-[rgba(129,140,248,0.2)] bg-[rgba(129,140,248,0.08)] py-1 pl-1 pr-3 text-[12px] text-indigo">
						<span className="rounded-sm bg-indigo px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-[0.08em] text-[#0b0b1a]">
							/YOU
						</span>
						Creator dashboard
					</div>
					<h1
						className="m-0 font-display font-normal leading-[0.95] tracking-[-0.03em]"
						style={{ fontSize: "clamp(36px, 5.5vw, 64px)" }}
					>
						Your forge, <span className="gold-text italic">in one ledger.</span>
					</h1>
					<p className="mx-auto max-w-xl text-[14.5px] text-text-secondary">
						Connect your wallet to see every token, launch, lock, and claim across Tempo.
					</p>
				</motion.div>

				<motion.div
					initial="hidden"
					animate="visible"
					variants={staggerContainer}
					className="grid gap-4 sm:grid-cols-3"
				>
					{FEATURES.map((feature) => (
						<motion.div key={feature.title} variants={fadeInUp}>
							<div className="h-full rounded-2xl border border-border-hair bg-bg-elevated p-5 text-left transition-colors hover:border-border-subtle">
								<div
									className="mb-4 flex size-10 items-center justify-center rounded-lg border"
									style={{
										background: `linear-gradient(135deg, ${feature.accent}25, ${feature.accent}08)`,
										borderColor: `${feature.accent}30`,
										color: feature.accent,
									}}
								>
									<feature.icon className="size-5" />
								</div>
								<h3 className="font-display text-[16px] tracking-[-0.01em] text-text-primary">
									{feature.title}
								</h3>
								<p className="mt-1.5 text-[13px] text-text-tertiary">{feature.description}</p>
							</div>
						</motion.div>
					))}
				</motion.div>

				<motion.div
					initial="hidden"
					animate="visible"
					variants={fadeInUp}
					transition={{ delay: 0.3 }}
					className="flex flex-col items-center gap-3"
				>
					<ConnectButton />
					<p className="text-[12px] text-text-tertiary">
						No sign-up required · Your wallet is your account
					</p>
				</motion.div>
			</div>
		</PageContainer>
	);
}
