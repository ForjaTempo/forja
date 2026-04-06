"use client";

import { CoinsIcon, DollarSignIcon, ShieldIcon, UsersIcon } from "lucide-react";
import Link from "next/link";
import type { DashboardOverviewData } from "@/actions/dashboard";
import { formatSupply } from "@/lib/format";

const formatter = new Intl.NumberFormat("en-US");

interface DashboardOverviewProps {
	overview: DashboardOverviewData;
}

export function DashboardOverview({ overview }: DashboardOverviewProps) {
	const tvl = BigInt(overview.totalValueLocked || "0");
	const tvlDisplay = tvl > 0n ? formatSupply(tvl) : "0";

	const stats = [
		{ icon: CoinsIcon, label: "Tokens Created", value: formatter.format(overview.tokensCreated) },
		{
			icon: UsersIcon,
			label: "Recipients Reached",
			value: formatter.format(overview.totalRecipients),
		},
		{ icon: ShieldIcon, label: "Value Locked", value: tvlDisplay },
		{
			icon: DollarSignIcon,
			label: "Est. Fees Paid (USDC)",
			value: `~${formatter.format(overview.totalFeesPaid)}`,
		},
	];

	const actions = [
		{ href: "/create", label: "Create Token" },
		{ href: "/multisend", label: "Multisend" },
		{ href: "/lock", label: "Lock Tokens" },
	];

	return (
		<div className="space-y-6">
			<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
				{stats.map((stat) => (
					<div
						key={stat.label}
						className="rounded-lg border border-anvil-gray-light bg-obsidian-black/50 p-4"
					>
						<div className="flex items-center gap-1.5 text-xs text-smoke-dark">
							<stat.icon className="size-3" />
							{stat.label}
						</div>
						<p className="mt-1 font-mono text-lg font-semibold text-steel-white">{stat.value}</p>
					</div>
				))}
			</div>

			<div className="flex flex-wrap gap-3">
				{actions.map((action) => (
					<Link
						key={action.href}
						href={action.href}
						className="rounded-md border border-anvil-gray-light bg-anvil-gray px-4 py-2 text-sm font-medium text-smoke transition-colors hover:border-molten-amber hover:text-molten-amber"
					>
						{action.label}
					</Link>
				))}
			</div>
		</div>
	);
}
