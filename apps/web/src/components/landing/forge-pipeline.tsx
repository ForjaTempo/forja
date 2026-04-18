"use client";

import {
	ArrowLeftRightIcon,
	CoinsIcon,
	GiftIcon,
	LockIcon,
	type LucideIcon,
	RocketIcon,
	SendIcon,
} from "lucide-react";
import Link from "next/link";

interface Stage {
	index: string;
	title: string;
	tagline: string;
	href: string;
	color: string;
	icon: LucideIcon;
}

const stages: Stage[] = [
	{
		index: "/01",
		title: "Raw supply",
		tagline: "Deploy a TIP-20",
		href: "/create",
		color: "#f0d38a",
		icon: CoinsIcon,
	},
	{
		index: "/02",
		title: "Distribute",
		tagline: "Multisend to holders",
		href: "/multisend",
		color: "#4ade80",
		icon: SendIcon,
	},
	{
		index: "/03",
		title: "Lock",
		tagline: "Vest with teeth",
		href: "/lock",
		color: "#818cf8",
		icon: LockIcon,
	},
	{
		index: "/04",
		title: "Airdrop",
		tagline: "Merkle claim",
		href: "/claim/create",
		color: "#ff6b3d",
		icon: GiftIcon,
	},
	{
		index: "/05",
		title: "Launch",
		tagline: "Bonding curve",
		href: "/launch",
		color: "#f472b6",
		icon: RocketIcon,
	},
	{
		index: "/06",
		title: "Trade",
		tagline: "Uniswap v4 routed",
		href: "/swap",
		color: "#60a5fa",
		icon: ArrowLeftRightIcon,
	},
];

/**
 * A horizontal forge-flow: six connected stages from raw supply → trade.
 * Each stage uses a Lucide icon matched to its tool (same palette and glyph
 * as <ToolCards />), linked through a molten trail that sweeps gold → ember
 * → blue so the page reads as one continuous production line.
 */
export function ForgePipeline() {
	return (
		<section className="relative px-6 py-28 lg:px-10">
			<div className="mx-auto max-w-[1400px]">
				<div className="reveal mx-auto mb-16 max-w-[720px] text-center">
					<div className="mb-4 inline-flex items-center justify-center gap-2 font-mono text-[11px] text-gold uppercase tracking-[0.2em]">
						<span className="h-px w-6 bg-gold" />
						The forge flow
						<span className="h-px w-6 bg-gold" />
					</div>
					<h2 className="m-0 font-display font-normal text-[clamp(36px,5.5vw,68px)] leading-[1.05] tracking-[-0.035em]">
						From raw supply
						<br />
						<span className="gold-text italic">to open market.</span>
					</h2>
					<p className="mt-5 text-[17px] text-text-secondary leading-[1.55]">
						Six stages, one unbroken chain. Every tool hands off cleanly to the next — no
						reconciling spreadsheets, no re-deploying contracts, no custody.
					</p>
				</div>

				<div className="relative">
					{/* Molten trail — animated gradient sweep creates the illusion of hot metal
					    flowing left→right through the forge line. Only renders on lg+ where
					    the 6 stages sit in a single row. */}
					<div
						aria-hidden
						className="-translate-y-1/2 absolute top-[42%] right-0 left-0 hidden h-px lg:block"
						style={{
							background:
								"linear-gradient(90deg, transparent 0%, rgba(240,211,138,0.3) 15%, rgba(255,107,61,0.4) 50%, rgba(96,165,250,0.3) 85%, transparent 100%)",
							backgroundSize: "200% 100%",
							animation: "gold-sweep 6s ease-in-out infinite",
						}}
					/>
					<div
						aria-hidden
						className="-translate-y-1/2 absolute top-[42%] right-0 left-0 hidden h-5 blur-2xl lg:block"
						style={{
							background:
								"linear-gradient(90deg, transparent 0%, rgba(240,211,138,0.3) 15%, rgba(255,107,61,0.4) 50%, rgba(96,165,250,0.3) 85%, transparent 100%)",
							backgroundSize: "200% 100%",
							animation: "gold-sweep 6s ease-in-out infinite",
						}}
					/>

					<ol className="relative grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6 lg:gap-3">
						{stages.map((stage, i) => {
							const Icon = stage.icon;
							return (
								<li key={stage.index} className="reveal" style={{ transitionDelay: `${i * 90}ms` }}>
									<Link
										href={stage.href}
										className="group relative flex flex-col items-center gap-3 rounded-2xl border border-border-hair bg-bg-elevated p-5 text-center transition-all duration-500 hover:-translate-y-1 hover:border-border-subtle"
									>
										<span
											className="absolute inset-x-0 top-0 h-0.5 rounded-t-2xl opacity-40 transition-opacity group-hover:opacity-100"
											style={{
												background: `linear-gradient(90deg, transparent, ${stage.color}, transparent)`,
											}}
										/>
										<div
											className="mb-1 flex size-12 items-center justify-center rounded-xl border transition-all duration-500 group-hover:-translate-y-0.5 group-hover:scale-110"
											style={{
												background: `linear-gradient(135deg, ${stage.color}25, ${stage.color}08)`,
												borderColor: `${stage.color}30`,
												color: stage.color,
												boxShadow: `0 8px 30px -12px ${stage.color}55, inset 0 1px 0 rgba(255,255,255,0.06)`,
											}}
										>
											<Icon className="size-5" strokeWidth={1.75} />
										</div>
										<div className="font-mono text-[10px] text-text-tertiary uppercase tracking-[0.14em]">
											{stage.index}
										</div>
										<div className="font-display text-[20px] leading-[1.1] tracking-[-0.02em]">
											{stage.title}
										</div>
										<div className="text-[12.5px] transition-colors" style={{ color: stage.color }}>
											{stage.tagline}
										</div>
									</Link>
								</li>
							);
						})}
					</ol>
				</div>
			</div>
		</section>
	);
}
