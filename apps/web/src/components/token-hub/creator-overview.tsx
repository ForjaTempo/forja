"use client";

import {
	ClockIcon,
	CoinsIcon,
	ExternalLinkIcon,
	GlobeIcon,
	LockIcon,
	MessageCircleIcon,
	SendIcon,
	ShieldIcon,
	UsersIcon,
	XIcon,
} from "lucide-react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { ExternalLinkGuard } from "@/components/shared/external-link-guard";
import { AddressDisplay } from "@/components/ui/address-display";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ImageFallback } from "@/components/ui/image-fallback";
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
		bannerUrl?: string | null;
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
			<div className="overflow-hidden rounded-xl border border-anvil-gray-light bg-deep-charcoal">
				{/* Banner */}
				<div className="relative h-32 w-full sm:h-48">
					{profile.bannerUrl ? (
						// biome-ignore lint/performance/noImgElement: external/uploaded banner URL
						<img
							src={profile.bannerUrl}
							alt={`${profile.displayName ?? "Creator"} banner`}
							className="h-full w-full object-cover"
						/>
					) : (
						<div className="h-full w-full bg-gradient-to-br from-indigo/30 via-anvil-gray to-obsidian-black" />
					)}
				</div>

				{/* Avatar + meta */}
				<div className="relative px-4 pb-4 pt-0 sm:px-6">
					<div className="-mt-10 flex flex-col gap-4 sm:-mt-12 sm:flex-row sm:items-end sm:justify-between">
						<div className="flex items-end gap-4">
							<div className="shrink-0 rounded-full border-4 border-deep-charcoal bg-deep-charcoal">
								{profile.avatarUrl ? (
									// biome-ignore lint/performance/noImgElement: user-uploaded/external avatar URL
									<img
										src={profile.avatarUrl}
										alt={profile.displayName ?? "Creator avatar"}
										className="size-20 rounded-full object-cover sm:size-24"
									/>
								) : (
									<ImageFallback
										name={profile.displayName ?? profile.address}
										size={96}
										variant="circle"
									/>
								)}
							</div>
							<div className="min-w-0 pb-1">
								<div className="flex flex-wrap items-center gap-2">
									<h1 className="truncate text-xl font-bold text-steel-white sm:text-2xl">
										{profile.displayName ?? "Creator Profile"}
									</h1>
									{profile.verified && <Badge variant="success">Verified</Badge>}
									{profile.profileClaimed && !profile.verified && (
										<Badge variant="success">Claimed</Badge>
									)}
								</div>
								<div className="mt-1">
									<AddressDisplay address={profile.address} showExplorer />
								</div>
							</div>
						</div>

						<div className="flex shrink-0 items-center gap-2 self-start sm:self-end">
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

					{profile.bio && (
						<p className="mt-4 max-w-2xl text-sm leading-relaxed text-smoke">{profile.bio}</p>
					)}

					{(profile.website || profile.twitterHandle || profile.telegramHandle) && (
						<div className="mt-4 flex flex-wrap items-center gap-2">
							{profile.website && (
								<ExternalLinkGuard
									href={
										profile.website.startsWith("http")
											? profile.website
											: `https://${profile.website}`
									}
									className="inline-flex items-center gap-1.5 rounded-md border border-anvil-gray-light bg-anvil-gray/40 px-2.5 py-1 text-xs text-smoke hover:border-indigo/50 hover:text-indigo"
								>
									<GlobeIcon className="size-3" />
									Website
								</ExternalLinkGuard>
							)}
							{profile.twitterHandle && (
								<a
									href={`https://x.com/${profile.twitterHandle.replace(/^@/, "")}`}
									target="_blank"
									rel="noopener noreferrer"
									className="inline-flex items-center gap-1.5 rounded-md border border-anvil-gray-light bg-anvil-gray/40 px-2.5 py-1 text-xs text-smoke hover:border-indigo/50 hover:text-indigo"
								>
									<XIcon className="size-3" />@{profile.twitterHandle.replace(/^@/, "")}
								</a>
							)}
							{profile.telegramHandle && (
								<a
									href={
										profile.telegramHandle.startsWith("http")
											? profile.telegramHandle
											: `https://t.me/${profile.telegramHandle.replace(/^@/, "")}`
									}
									target="_blank"
									rel="noopener noreferrer"
									className="inline-flex items-center gap-1.5 rounded-md border border-anvil-gray-light bg-anvil-gray/40 px-2.5 py-1 text-xs text-smoke hover:border-indigo/50 hover:text-indigo"
								>
									<MessageCircleIcon className="size-3" />
									Telegram
								</a>
							)}
						</div>
					)}
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
