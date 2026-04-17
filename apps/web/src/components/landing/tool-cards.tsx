"use client";

import { motion } from "framer-motion";
import {
	ArrowLeftRightIcon,
	GiftIcon,
	HammerIcon,
	LockIcon,
	RocketIcon,
	SendIcon,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { hasLaunchpad, hasSwap } from "@/lib/constants";
import { hasClaimer } from "@/lib/contracts";
import { fadeInUp, staggerContainer } from "@/lib/motion";

const allTools = [
	{
		title: "Token Create",
		description:
			"Deploy your own TIP-20 token in seconds. Set name, symbol, supply — no Solidity required.",
		href: "/create",
		icon: HammerIcon,
		accent: "from-indigo/20 to-indigo/5",
		iconColor: "text-indigo",
	},
	{
		title: "Multisend",
		description:
			"Distribute tokens to up to 500 addresses in a single transaction. Airdrops made simple.",
		href: "/multisend",
		icon: SendIcon,
		accent: "from-forge-green/20 to-forge-green/5",
		iconColor: "text-forge-green",
	},
	{
		title: "Token Lock",
		description:
			"Lock tokens with vesting schedules, cliff periods, and optional revocation for trust.",
		href: "/lock",
		icon: LockIcon,
		accent: "from-sky-500/20 to-sky-500/5",
		iconColor: "text-sky-400",
	},
	{
		title: "Claim",
		description:
			"Create Merkle-based claim campaigns. Let eligible wallets claim tokens with proof verification.",
		href: "/claim/create",
		icon: GiftIcon,
		accent: "from-purple-500/20 to-purple-500/5",
		iconColor: "text-purple-400",
	},
	{
		title: "Launchpad",
		description:
			"Launch tokens with bonding curves. Fair price discovery, automatic liquidity, and graduation.",
		href: "/launch",
		icon: RocketIcon,
		accent: "from-amber-500/20 to-amber-500/5",
		iconColor: "text-amber-400",
	},
	{
		title: "Swap",
		description:
			"Trade any TIP-20 token instantly. Best route across Uniswap v4 + transparent 0.25% fee.",
		href: "/swap",
		icon: ArrowLeftRightIcon,
		accent: "from-rose-500/20 to-rose-500/5",
		iconColor: "text-rose-400",
	},
] as const;

export function ToolCards() {
	const tools = allTools.filter((tool) => {
		if (tool.href === "/claim/create" && !hasClaimer) return false;
		if (tool.href === "/launch" && !hasLaunchpad) return false;
		if (tool.href === "/swap" && !hasSwap) return false;
		return true;
	});
	return (
		<section className="py-20 sm:py-24">
			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<div className="text-center">
					<p className="font-mono text-xs uppercase tracking-[0.2em] text-indigo">Tools</p>
					<h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
						Everything you need
					</h2>
					<p className="mx-auto mt-3 max-w-xl text-base text-smoke-dark">
						All-in-one toolkit to create, distribute, lock, claim, launch, and trade tokens on
						Tempo.
					</p>
				</div>

				<motion.div
					className="mt-14 grid gap-6 md:grid-cols-6"
					variants={staggerContainer}
					initial="hidden"
					whileInView="visible"
					viewport={{ once: true, margin: "-50px" }}
				>
					{tools.map((tool, index) => {
						// 3+2 layout on md+ when 5 tools: first 3 span 2 cols, last 2 span 3 cols.
						// For fewer tools, each spans 2 cols (3-up) to preserve visual balance.
						const span = tools.length === 5 && index >= 3 ? "md:col-span-3" : "md:col-span-2";
						return (
							<motion.div key={tool.href} variants={fadeInUp} className={span}>
								<Card
									variant="interactive"
									className="group relative h-full border-anvil-gray-light/60 bg-anvil-gray/50"
								>
									{/* Top gradient accent line */}
									<div
										className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r ${tool.accent}`}
									/>

									<CardHeader>
										<div
											className={`mb-2 flex size-11 items-center justify-center rounded-lg bg-anvil-gray-light ${tool.iconColor}`}
										>
											<tool.icon className="size-5" />
										</div>
										<CardTitle className="text-lg">{tool.title}</CardTitle>
										<CardDescription className="text-smoke-dark">
											{tool.description}
										</CardDescription>
									</CardHeader>

									<CardFooter>
										<Button
											asChild
											variant="ghost"
											className="gap-1.5 px-0 text-sm text-smoke hover:text-steel-white"
										>
											<Link href={tool.href}>
												Get started
												<SendIcon className="size-3.5" />
											</Link>
										</Button>
									</CardFooter>
								</Card>
							</motion.div>
						);
					})}
				</motion.div>
			</div>
		</section>
	);
}
