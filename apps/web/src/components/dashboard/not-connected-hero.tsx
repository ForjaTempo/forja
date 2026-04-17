"use client";

import { motion } from "framer-motion";
import { BarChart3Icon, BellIcon, LayersIcon, type LucideIcon } from "lucide-react";
import { ConnectButton } from "@/components/layout/connect-button";
import { PageContainer } from "@/components/layout/page-container";
import { Card, CardContent } from "@/components/ui/card";
import { fadeInUp, staggerContainer } from "@/lib/motion";

interface Feature {
	icon: LucideIcon;
	title: string;
	description: string;
	tone: string;
}

const FEATURES: Feature[] = [
	{
		icon: LayersIcon,
		title: "Manage Your Tools",
		description: "Tokens, multisends, locks, claims, and launches — all in one place.",
		tone: "text-indigo",
	},
	{
		icon: BarChart3Icon,
		title: "Analytics & Insights",
		description: "Holder growth, transfer activity, and concentration signals at a glance.",
		tone: "text-forge-green",
	},
	{
		icon: BellIcon,
		title: "Watchlist & Alerts",
		description: "Track tokens you care about and get notified when they move.",
		tone: "text-purple-400",
	},
];

export function NotConnectedHero() {
	return (
		<PageContainer className="py-12 sm:py-20">
			<div className="mx-auto max-w-4xl space-y-12 text-center">
				<motion.div initial="hidden" animate="visible" variants={fadeInUp} className="space-y-3">
					<h1 className="text-3xl font-bold tracking-tight text-steel-white sm:text-4xl">
						Track your creator activity on Tempo
					</h1>
					<p className="mx-auto max-w-xl text-base text-smoke-dark">
						Connect your wallet to see tokens, launches, locks, and alerts in one dashboard.
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
							<Card
								variant="interactive"
								className="h-full border-anvil-gray-light bg-deep-charcoal"
							>
								<CardContent className="space-y-3 p-5 text-left">
									<div
										className={`flex size-10 items-center justify-center rounded-lg bg-anvil-gray-light ${feature.tone}`}
									>
										<feature.icon className="size-5" />
									</div>
									<h3 className="text-base font-semibold text-steel-white">{feature.title}</h3>
									<p className="text-sm text-smoke-dark">{feature.description}</p>
								</CardContent>
							</Card>
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
					<p className="text-xs text-smoke-dark">
						No sign-up required. Your wallet is your account.
					</p>
				</motion.div>
			</div>
		</PageContainer>
	);
}
