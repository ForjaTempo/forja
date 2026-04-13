"use client";

import {
	ClockIcon,
	CoinsIcon,
	ExternalLinkIcon,
	GlobeIcon,
	LockIcon,
	SendIcon,
	ShieldIcon,
	UsersIcon,
	XIcon,
} from "lucide-react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { AddressDisplay } from "@/components/ui/address-display";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
		totalValueLocked: string;
		firstSeen: Date | null;
		displayName?: string | null;
		bio?: string | null;
		avatarUrl?: string | null;
		website?: string | null;
		twitterHandle?: string | null;
		telegramHandle?: string | null;
		verified?: boolean;
		profileClaimed?: boolean;
	};
}

export function CreatorOverview({ profile }: CreatorOverviewProps) {
	const explorerUrl = useExplorerUrl();
	const { address: connectedAddress } = useAccount();
	const isOwner = connectedAddress?.toLowerCase() === profile.address.toLowerCase();

	const tvl = BigInt(profile.totalValueLocked || "0");
	const tvlDisplay = tvl > 0n ? formatter.format(Number(tvl / 10n ** 6n)) : "0";

	const stats = [
		{ icon: CoinsIcon, label: "Tokens Created", value: formatter.format(profile.tokensCreated) },
		{ icon: SendIcon, label: "Multisends", value: formatter.format(profile.multisendCount) },
		{ icon: LockIcon, label: "Locks Created", value: formatter.format(profile.lockCount) },
		{
			icon: UsersIcon,
			label: "Total Recipients",
			value: formatter.format(profile.totalRecipients),
		},
		{
			icon: ShieldIcon,
			label: "Value Locked",
			value: tvlDisplay,
		},
		{
			icon: ClockIcon,
			label: "First Seen",
			value: profile.firstSeen ? formatDate(profile.firstSeen) : "—",
		},
	];

	return (
		<div className="space-y-6">
			<div className="flex items-start justify-between gap-4">
				<div className="flex items-center gap-4">
					{profile.avatarUrl ? (
						<img
							src={profile.avatarUrl}
							alt={profile.displayName ?? "Creator avatar"}
							className="size-16 rounded-full object-cover"
						/>
					) : (
						<div className="flex size-16 items-center justify-center rounded-full bg-anvil-gray text-xl font-bold text-indigo">
							{(profile.displayName ?? profile.address).slice(0, 2).toUpperCase()}
						</div>
					)}
					<div>
						<div className="flex items-center gap-2">
							<h1 className="text-2xl font-bold text-steel-white">
								{profile.displayName ?? "Creator Profile"}
							</h1>
							{profile.verified && (
								<Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
									Verified
								</Badge>
							)}
							{profile.profileClaimed && !profile.verified && (
								<Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
									Claimed
								</Badge>
							)}
						</div>
						<div className="mt-1">
							<AddressDisplay address={profile.address} showExplorer />
						</div>
						{profile.bio && <p className="mt-2 max-w-lg text-sm text-smoke">{profile.bio}</p>}
						{/* Social links */}
						<div className="mt-2 flex flex-wrap items-center gap-3">
							{profile.website && (
								<a
									href={profile.website}
									target="_blank"
									rel="noopener noreferrer"
									className="inline-flex items-center gap-1 text-xs text-smoke transition-colors hover:text-indigo"
								>
									<GlobeIcon className="size-3" />
									Website
								</a>
							)}
							{profile.twitterHandle && (
								<a
									href={`https://x.com/${profile.twitterHandle}`}
									target="_blank"
									rel="noopener noreferrer"
									className="inline-flex items-center gap-1 text-xs text-smoke transition-colors hover:text-indigo"
								>
									<XIcon className="size-3" />@{profile.twitterHandle}
								</a>
							)}
							{profile.telegramHandle && (
								<a
									href={`https://t.me/${profile.telegramHandle}`}
									target="_blank"
									rel="noopener noreferrer"
									className="inline-flex items-center gap-1 text-xs text-smoke transition-colors hover:text-indigo"
								>
									@{profile.telegramHandle}
								</a>
							)}
						</div>
					</div>
				</div>
				<div className="flex items-center gap-2">
					{isOwner && (
						<Link href="/profile">
							<Button
								variant="outline"
								size="sm"
								className="border-anvil-gray-light text-smoke hover:text-steel-white"
							>
								{profile.profileClaimed ? "Edit Profile" : "Claim Profile"}
							</Button>
						</Link>
					)}
					<a
						href={`${explorerUrl}/address/${profile.address}`}
						target="_blank"
						rel="noopener noreferrer"
						className="inline-flex items-center gap-1 text-sm text-smoke transition-colors hover:text-indigo"
					>
						Explorer
						<ExternalLinkIcon className="size-3" />
					</a>
				</div>
			</div>

			<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
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
