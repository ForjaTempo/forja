"use client";

import {
	BellIcon,
	CoinsIcon,
	EyeIcon,
	GiftIcon,
	HammerIcon,
	LockIcon,
	RocketIcon,
	SendIcon,
	ShieldIcon,
	UsersIcon,
} from "lucide-react";
import Link from "next/link";
import type { DashboardOverviewData } from "@/actions/dashboard";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { Badge } from "@/components/ui/badge";
import { hasLaunchpad } from "@/lib/contracts";
import { formatSupply } from "@/lib/format";

function shortAddress(addr: string): string {
	return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function parseTvl(raw: string): number {
	try {
		return Number(BigInt(raw)) / 1_000_000;
	} catch {
		return 0;
	}
}

interface DashboardOverviewProps {
	overview: DashboardOverviewData;
	address: string;
}

export function DashboardOverview({ overview, address }: DashboardOverviewProps) {
	const tvlBig = BigInt(overview.totalValueLocked || "0");
	const tvlCompact = tvlBig > 0n ? formatSupply(tvlBig) : "0";
	const tvlNumeric = parseTvl(overview.totalValueLocked);
	const welcome = overview.displayName || shortAddress(address);

	const actions = [
		{ href: "/create", label: "Create Token", icon: HammerIcon },
		{ href: "/multisend", label: "Multisend", icon: SendIcon },
		{ href: "/lock", label: "Lock Tokens", icon: LockIcon },
		{ href: "/claim/create", label: "Claim", icon: GiftIcon },
		...(hasLaunchpad ? [{ href: "/launch/create", label: "Launchpad", icon: RocketIcon }] : []),
	];

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between gap-4">
				<div>
					<h2 className="text-xl font-semibold text-steel-white sm:text-2xl">
						Welcome back, {welcome}
					</h2>
					<p className="mt-0.5 text-sm text-smoke-dark">
						Here&apos;s your creator activity on Tempo.
					</p>
				</div>
				{overview.unreadAlerts > 0 && (
					<Link
						href="#alerts"
						className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-indigo/40 bg-indigo/10 px-3 py-1.5 text-xs text-indigo hover:bg-indigo/20"
					>
						<BellIcon className="size-3.5" />
						{overview.unreadAlerts} unread
					</Link>
				)}
			</div>

			{/* Hero stats — 2 large */}
			<div className="grid gap-4 sm:grid-cols-2">
				<HeroStat
					icon={<CoinsIcon className="size-5 text-indigo" />}
					label="Tokens Created"
					value={overview.tokensCreated}
					format="number"
				/>
				<HeroStat
					icon={<ShieldIcon className="size-5 text-forge-green" />}
					label="Value Locked"
					value={tvlNumeric}
					display={tvlCompact}
					format="compact"
				/>
			</div>

			{/* Medium stats — 3 */}
			<div className="grid gap-3 sm:grid-cols-3">
				<MediumStat
					icon={<UsersIcon className="size-4" />}
					label="Recipients Reached"
					value={overview.totalRecipients}
				/>
				<MediumStat
					icon={<RocketIcon className="size-4" />}
					label="Launches"
					value={overview.launchCount}
				/>
				<MediumStat
					icon={<EyeIcon className="size-4" />}
					label="Watchlist"
					value={overview.watchlistCount}
				/>
			</div>

			{/* Quick actions */}
			<div className="space-y-2">
				<p className="text-xs font-medium uppercase tracking-wider text-smoke-dark">
					Quick Actions
				</p>
				<div className="flex flex-wrap gap-2">
					{actions.map((action) => (
						<Link
							key={action.href}
							href={action.href}
							className="inline-flex items-center gap-1.5 rounded-md border border-anvil-gray-light bg-anvil-gray px-3 py-2 text-sm font-medium text-smoke transition-colors hover:border-indigo hover:text-indigo"
						>
							<action.icon className="size-3.5" />
							{action.label}
						</Link>
					))}
				</div>
			</div>
		</div>
	);
}

function HeroStat({
	icon,
	label,
	value,
	display,
	format = "number",
}: {
	icon: React.ReactNode;
	label: string;
	value: number;
	display?: string;
	format?: "number" | "compact";
}) {
	return (
		<div className="rounded-xl border border-border-subtle bg-surface-card p-5 sm:p-6">
			<div className="flex items-center gap-2 text-smoke-dark">
				{icon}
				<span className="text-sm">{label}</span>
			</div>
			<div className="mt-3">
				{display ? (
					<p className="font-mono text-3xl font-bold text-steel-white sm:text-4xl">{display}</p>
				) : (
					<AnimatedCounter
						value={value}
						format={format}
						className="font-mono text-3xl font-bold text-steel-white sm:text-4xl"
					/>
				)}
			</div>
		</div>
	);
}

function MediumStat({
	icon,
	label,
	value,
}: {
	icon: React.ReactNode;
	label: string;
	value: number;
}) {
	return (
		<div className="rounded-xl border border-border-subtle bg-surface-card p-4">
			<div className="flex items-center gap-2 text-smoke-dark">
				{icon}
				<span className="text-xs">{label}</span>
			</div>
			<AnimatedCounter
				value={value}
				className="mt-2 block font-mono text-2xl font-semibold text-steel-white"
			/>
		</div>
	);
}

export { Badge };
