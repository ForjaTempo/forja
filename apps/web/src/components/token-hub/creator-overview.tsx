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

const socialBtnCls =
	"inline-flex items-center gap-1.5 rounded-lg border border-border-hair bg-bg-field px-2.5 py-1 font-medium text-[11px] text-text-secondary transition-colors hover:border-border-subtle hover:text-gold";

export function CreatorOverview({ profile }: CreatorOverviewProps) {
	const explorerUrl = useExplorerUrl();
	const { address: connectedAddress } = useAccount();
	const isOwner = connectedAddress?.toLowerCase() === profile.address.toLowerCase();

	const tvl = BigInt(profile.totalValueLocked || "0");
	const tvlDisplay = tvl > 0n ? formatter.format(Number(tvl / 10n ** 6n)) : "0";

	const stats = [
		{ icon: CoinsIcon, label: "Tokens", value: formatter.format(profile.tokensCreated) },
		{ icon: SendIcon, label: "Multisends", value: formatter.format(profile.multisendCount) },
		{ icon: LockIcon, label: "Locks", value: formatter.format(profile.lockCount) },
		{ icon: UsersIcon, label: "Recipients", value: formatter.format(profile.totalRecipients) },
		{ icon: ShieldIcon, label: "Value locked", value: tvlDisplay },
		{
			icon: ClockIcon,
			label: "First seen",
			value: profile.firstSeen ? formatDate(profile.firstSeen) : "—",
		},
	];

	return (
		<div className="space-y-6">
			<div className="overflow-hidden rounded-2xl border border-border-hair bg-bg-elevated">
				<div className="relative h-32 w-full sm:h-48">
					{profile.bannerUrl ? (
						// biome-ignore lint/performance/noImgElement: external/uploaded banner URL
						<img
							src={profile.bannerUrl}
							alt={`${profile.displayName ?? "Creator"} banner`}
							className="h-full w-full object-cover"
						/>
					) : (
						<div
							className="h-full w-full"
							style={{
								background:
									"linear-gradient(135deg, rgba(129,140,248,0.25), rgba(240,211,138,0.12), rgba(255,107,61,0.08))",
							}}
						/>
					)}
				</div>

				<div className="relative px-4 pt-0 pb-5 sm:px-6">
					<div className="-mt-10 flex flex-col gap-4 sm:-mt-12 sm:flex-row sm:items-end sm:justify-between">
						<div className="flex items-end gap-4">
							<div className="shrink-0 rounded-full border-4 border-bg-elevated bg-bg-elevated">
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
									<h1 className="truncate font-display text-[24px] leading-[1.1] tracking-[-0.02em] text-text-primary sm:text-[28px]">
										{profile.displayName ?? "Creator profile"}
									</h1>
									{profile.verified && (
										<span className="inline-flex items-center rounded-full border border-green/30 bg-green/10 px-2 py-0.5 font-mono text-[10px] text-green uppercase tracking-[0.12em]">
											Verified
										</span>
									)}
									{profile.profileClaimed && !profile.verified && (
										<span className="inline-flex items-center rounded-full border border-green/30 bg-green/10 px-2 py-0.5 font-mono text-[10px] text-green uppercase tracking-[0.12em]">
											Claimed
										</span>
									)}
								</div>
								<div className="mt-1.5">
									<AddressDisplay address={profile.address} showExplorer />
								</div>
							</div>
						</div>

						<div className="flex shrink-0 items-center gap-2 self-start sm:self-end">
							{isOwner && (
								<Link
									href="/profile"
									className="inline-flex items-center gap-2 rounded-xl border border-border-hair bg-bg-field px-3 py-1.5 font-medium text-[12px] text-text-secondary transition-colors hover:border-border-subtle hover:text-text-primary"
								>
									{profile.profileClaimed ? "Edit profile" : "Claim profile"}
								</Link>
							)}
							<a
								href={`${explorerUrl}/address/${profile.address}`}
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex items-center gap-1 font-mono text-[12px] text-text-secondary transition-colors hover:text-gold"
							>
								Explorer
								<ExternalLinkIcon className="size-3" />
							</a>
						</div>
					</div>

					{profile.bio && (
						<p className="mt-5 max-w-2xl text-[14px] leading-relaxed text-text-secondary">
							{profile.bio}
						</p>
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
									className={socialBtnCls}
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
									className={socialBtnCls}
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
									className={socialBtnCls}
								>
									<MessageCircleIcon className="size-3" />
									Telegram
								</a>
							)}
						</div>
					)}
				</div>
			</div>

			<div
				className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border-hair sm:grid-cols-3 lg:grid-cols-6"
				style={{ background: "var(--color-border-hair)" }}
			>
				{stats.map((stat) => (
					<div key={stat.label} className="bg-bg-elevated px-4 py-3.5">
						<div className="flex items-center gap-1.5 font-mono text-[10px] text-text-tertiary uppercase tracking-[0.12em]">
							<stat.icon className="size-3" />
							{stat.label}
						</div>
						<p className="mt-1.5 font-display text-[18px] tracking-[-0.01em] text-text-primary">
							{stat.value}
						</p>
					</div>
				))}
			</div>
		</div>
	);
}
