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
import { useState } from "react";
import { hasLaunchpad, hasSwap } from "@/lib/constants";
import { hasClaimer } from "@/lib/contracts";

type ToolKey = "create" | "multisend" | "lock" | "claim" | "launchpad" | "swap";

interface Tool {
	key: ToolKey;
	title: string;
	tagline: string;
	description: string;
	stat: string;
	color: string;
	href: string;
	icon: LucideIcon;
	enabled: boolean;
}

const allTools: Tool[] = [
	{
		key: "create",
		title: "Create",
		tagline: "Deploy a TIP-20 in 30 seconds",
		description:
			"Name, symbol, supply — no Solidity, no compilers, no dev. Your token is live before your coffee cools.",
		stat: "Instant deploy · 2 USDC fee",
		color: "#f0d38a",
		href: "/create",
		icon: CoinsIcon,
		enabled: true,
	},
	{
		key: "multisend",
		title: "Multisend",
		tagline: "Distribute to 500 in one tx",
		description:
			"Batch transfers with gas savings built in. Payroll, airdrops, rewards — move tokens like a spreadsheet.",
		stat: "500 recipients per tx",
		color: "#4ade80",
		href: "/multisend",
		icon: SendIcon,
		enabled: true,
	},
	{
		key: "lock",
		title: "Lock",
		tagline: "Vesting with teeth",
		description:
			"Time-lock tokens with cliff, linear vesting, and optional revocation. Trust encoded in the contract.",
		stat: "Cliff + linear vesting",
		color: "#818cf8",
		href: "/lock",
		icon: LockIcon,
		enabled: true,
	},
	{
		key: "claim",
		title: "Claim",
		tagline: "Merkle-proof airdrops",
		description:
			"Publish a million eligible wallets with a single root hash. Gas-free for you, permissionless for them.",
		stat: "Merkle tree · public proofs",
		color: "#ff6b3d",
		href: "/claim/create",
		icon: GiftIcon,
		enabled: hasClaimer,
	},
	{
		key: "launchpad",
		title: "Launchpad",
		tagline: "Fair-launch bonding curves",
		description:
			"Price discovery by math, not market-makers. Liquidity graduates to Uniswap v4 automatically.",
		stat: "Bonding curve · auto graduation",
		color: "#f472b6",
		href: "/launch",
		icon: RocketIcon,
		enabled: hasLaunchpad,
	},
	{
		key: "swap",
		title: "Swap",
		tagline: "Instant trade, flat fee",
		description:
			"Every TIP-20 tradable via Uniswap v4 routing on Tempo. 0.25% protocol fee, transparent on-chain.",
		stat: "Uniswap v4 · 0.25% fee",
		color: "#60a5fa",
		href: "/swap",
		icon: ArrowLeftRightIcon,
		enabled: hasSwap,
	},
];

export function ToolCards() {
	const [hovered, setHovered] = useState<number | null>(null);
	const tools = allTools.filter((t) => t.enabled);

	return (
		<section className="px-6 pt-40 pb-20 lg:px-10">
			<div className="mx-auto max-w-[1400px]">
				<div className="reveal mb-20 max-w-[720px]">
					<div className="mb-5 inline-flex items-center gap-2 font-mono text-[11px] text-gold uppercase tracking-[0.2em]">
						<span className="h-px w-6 bg-gold" />
						Six tools. One forge.
					</div>
					<h2 className="m-0 font-display font-normal text-[clamp(40px,6vw,80px)] leading-[1] tracking-[-0.035em]">
						Everything a token needs,
						<br />
						<span className="text-text-secondary italic">from spark to scale.</span>
					</h2>
				</div>

				<div
					className="grid overflow-hidden rounded-3xl border border-border-hair md:grid-cols-2 lg:grid-cols-3"
					style={{ background: "var(--color-border-hair)", gap: 1 }}
				>
					{tools.map((tool, i) => {
						const Icon = tool.icon;
						return (
							<Link
								key={tool.key}
								href={tool.href}
								onMouseEnter={() => setHovered(i)}
								onMouseLeave={() => setHovered(null)}
								className="group reveal relative flex min-h-[320px] flex-col justify-between overflow-hidden bg-bg-page px-8 py-10"
								style={{ transitionDelay: `${i * 0.05}s` }}
							>
								<div
									aria-hidden
									className="-top-20 -right-20 absolute size-60 blur-3xl transition-opacity duration-500"
									style={{
										background: `radial-gradient(circle, ${tool.color}30, transparent 70%)`,
										opacity: hovered === i ? 1 : 0.3,
									}}
								/>
								<div className="relative z-[2]">
									<div
										className="mb-7 flex size-14 items-center justify-center rounded-xl border transition-transform duration-500 group-hover:-translate-y-0.5 group-hover:scale-[1.04]"
										style={{
											background: `linear-gradient(135deg, ${tool.color}25, ${tool.color}08)`,
											borderColor: `${tool.color}30`,
											color: tool.color,
											boxShadow: `0 8px 30px -12px ${tool.color}55, inset 0 1px 0 rgba(255,255,255,0.06)`,
										}}
									>
										<Icon className="size-6" strokeWidth={1.75} />
									</div>
									<div className="mb-1.5 font-mono text-[10px] text-text-tertiary uppercase tracking-[0.15em]">
										/{tool.key}
									</div>
									<h3 className="m-0 mb-1.5 font-display font-normal text-[34px] tracking-[-0.025em]">
										{tool.title}
									</h3>
									<div className="mb-3.5 font-medium text-[13.5px]" style={{ color: tool.color }}>
										{tool.tagline}
									</div>
									<p className="m-0 text-[14px] text-text-secondary leading-[1.6]">
										{tool.description}
									</p>
								</div>
								<div className="relative z-[2] mt-7 flex justify-between border-border-hair border-t pt-5 font-mono text-[12px] text-text-tertiary">
									<span>{tool.stat}</span>
									<span
										className="transition-colors"
										style={{ color: hovered === i ? tool.color : "var(--color-text-tertiary)" }}
									>
										Open →
									</span>
								</div>
							</Link>
						);
					})}
				</div>
			</div>
		</section>
	);
}
