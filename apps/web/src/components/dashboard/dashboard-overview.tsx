"use client";

import { CoinsIcon, DollarSignIcon, ShieldIcon, UsersIcon } from "lucide-react";
import Link from "next/link";
import type { DashboardOverviewData } from "@/actions/dashboard";
import { StatCard } from "@/components/ui/stat-card";
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
					<StatCard
						key={stat.label}
						label={stat.label}
						value={stat.value}
						icon={<stat.icon className="size-3" />}
					/>
				))}
			</div>

			<div className="flex flex-wrap gap-3">
				{actions.map((action) => (
					<Link
						key={action.href}
						href={action.href}
						className="rounded-md border border-anvil-gray-light bg-anvil-gray px-4 py-2 text-sm font-medium text-smoke transition-colors hover:border-indigo hover:text-indigo"
					>
						{action.label}
					</Link>
				))}
			</div>
		</div>
	);
}
