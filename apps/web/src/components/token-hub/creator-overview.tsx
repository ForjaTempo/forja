"use client";

import { CoinsIcon, SendIcon, LockIcon, UsersIcon, ClockIcon, ExternalLinkIcon } from "lucide-react";
import { AddressDisplay } from "@/components/ui/address-display";
import { useExplorerUrl } from "@/hooks/use-explorer-url";
import { formatDate } from "@/lib/format";

const formatter = new Intl.NumberFormat("en-US");

interface CreatorOverviewProps {
	profile: {
		address: string;
		tokensCreated: number;
		multisendCount: number;
		lockCount: number;
		totalRecipients: number;
		firstSeen: Date | null;
	};
}

export function CreatorOverview({ profile }: CreatorOverviewProps) {
	const explorerUrl = useExplorerUrl();

	const stats = [
		{ icon: CoinsIcon, label: "Tokens Created", value: formatter.format(profile.tokensCreated) },
		{ icon: SendIcon, label: "Multisends", value: formatter.format(profile.multisendCount) },
		{ icon: LockIcon, label: "Locks Created", value: formatter.format(profile.lockCount) },
		{ icon: UsersIcon, label: "Total Recipients", value: formatter.format(profile.totalRecipients) },
		{ icon: ClockIcon, label: "First Seen", value: profile.firstSeen ? formatDate(profile.firstSeen) : "—" },
	];

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold text-steel-white">Creator Profile</h1>
					<div className="mt-1">
						<AddressDisplay address={profile.address} showExplorer />
					</div>
				</div>
				<a
					href={`${explorerUrl}/address/${profile.address}`}
					target="_blank"
					rel="noopener noreferrer"
					className="inline-flex items-center gap-1 text-sm text-smoke transition-colors hover:text-molten-amber"
				>
					Explorer
					<ExternalLinkIcon className="size-3" />
				</a>
			</div>

			<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
				{stats.map((stat) => (
					<div
						key={stat.label}
						className="rounded-lg border border-anvil-gray-light bg-obsidian-black/50 p-3"
					>
						<div className="flex items-center gap-1.5 text-xs text-smoke-dark">
							<stat.icon className="size-3" />
							{stat.label}
						</div>
						<p className="mt-1 font-mono text-sm font-semibold text-steel-white">{stat.value}</p>
					</div>
				))}
			</div>
		</div>
	);
}
