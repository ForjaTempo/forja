"use client";

import {
	AlertTriangleIcon,
	CheckCircleIcon,
	ClockIcon,
	RocketIcon,
	SparklesIcon,
	UserCheckIcon,
	ZapIcon,
} from "lucide-react";
import type { TrustSignals } from "@/actions/trust-signals";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface TrustBadgesProps {
	signals: TrustSignals;
	compact?: boolean;
}

interface BadgeDef {
	key: string;
	label: string;
	description: string;
	className: string;
	icon?: React.ReactNode;
}

function getBadges(signals: TrustSignals): BadgeDef[] {
	const badges: BadgeDef[] = [];

	if (signals.isForjaCreated) {
		badges.push({
			key: "forja",
			label: "FORJA",
			description: "Created with FORJA token toolkit",
			className: "bg-molten-amber/15 text-molten-amber border-molten-amber/30",
			icon: <SparklesIcon className="size-2.5" />,
		});
	}

	if (signals.isLaunchpadToken) {
		badges.push({
			key: "launchpad",
			label: "Launchpad",
			description: "Launched via FORJA bonding curve",
			className: "bg-molten-amber/15 text-molten-amber border-molten-amber/30",
			icon: <RocketIcon className="size-2.5" />,
		});
	}

	if (signals.verified) {
		badges.push({
			key: "verified",
			label: "Verified",
			description: "Creator identity verified by FORJA team",
			className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
			icon: <CheckCircleIcon className="size-2.5" />,
		});
	} else if (signals.profileClaimed) {
		badges.push({
			key: "claimed",
			label: "Claimed",
			description: "Creator has claimed their profile",
			className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
			icon: <UserCheckIcon className="size-2.5" />,
		});
	}

	if (signals.isNew) {
		badges.push({
			key: "new",
			label: "New",
			description: "Token created less than 7 days ago",
			className: "bg-blue-500/15 text-blue-400 border-blue-500/30",
			icon: <ZapIcon className="size-2.5" />,
		});
	}

	if (signals.isActive) {
		badges.push({
			key: "active",
			label: "Active",
			description: "Transfers in the last 7 days",
			className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
			icon: <ZapIcon className="size-2.5" />,
		});
	} else if (signals.isDormant) {
		badges.push({
			key: "dormant",
			label: "Dormant",
			description: "No transfers in the last 30 days",
			className: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
			icon: <ClockIcon className="size-2.5" />,
		});
	}

	if (signals.topHolderPct > 80) {
		badges.push({
			key: "concentration-high",
			label: `${signals.topHolderPct}% held`,
			description: "Very high concentration — top holder owns over 80% of supply",
			className: "bg-red-500/15 text-red-400 border-red-500/30",
			icon: <AlertTriangleIcon className="size-2.5" />,
		});
	} else if (signals.topHolderPct > 50) {
		badges.push({
			key: "concentration",
			label: `${signals.topHolderPct}% held`,
			description: "High concentration — top holder owns over 50% of supply",
			className: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
			icon: <AlertTriangleIcon className="size-2.5" />,
		});
	}

	return badges;
}

export function TrustBadges({ signals, compact }: TrustBadgesProps) {
	const allBadges = getBadges(signals);

	if (allBadges.length === 0) return null;

	const maxDisplay = compact ? 3 : allBadges.length;
	const visible = allBadges.slice(0, maxDisplay);
	const remaining = allBadges.length - maxDisplay;

	return (
		<TooltipProvider>
			<div className="flex flex-wrap items-center gap-1">
				{visible.map((badge) => (
					<Tooltip key={badge.key}>
						<TooltipTrigger asChild>
							<Badge className={`${badge.className} inline-flex items-center gap-1`}>
								{badge.icon}
								{badge.label}
							</Badge>
						</TooltipTrigger>
						<TooltipContent>
							<p>{badge.description}</p>
						</TooltipContent>
					</Tooltip>
				))}
				{remaining > 0 && (
					<Tooltip>
						<TooltipTrigger asChild>
							<Badge className="bg-anvil-gray/50 text-smoke border-anvil-gray-light">
								+{remaining}
							</Badge>
						</TooltipTrigger>
						<TooltipContent>
							<div className="space-y-1">
								{allBadges.slice(maxDisplay).map((badge) => (
									<p key={badge.key}>
										{badge.label}: {badge.description}
									</p>
								))}
							</div>
						</TooltipContent>
					</Tooltip>
				)}
			</div>
		</TooltipProvider>
	);
}

/** Lightweight inline badges for token cards — uses tokenHubCache data directly without server action */
export function TokenCardBadges({
	isForjaCreated,
	isLaunchpadToken,
	topHolderPct,
}: {
	isForjaCreated: boolean;
	isLaunchpadToken?: boolean;
	topHolderPct: number;
}) {
	return (
		<div className="flex flex-col items-end gap-1">
			{isForjaCreated && (
				<Badge className="bg-molten-amber/15 text-molten-amber border-molten-amber/30 inline-flex items-center gap-1">
					<SparklesIcon className="size-2.5" />
					FORJA
				</Badge>
			)}
			{isLaunchpadToken && (
				<Badge className="bg-molten-amber/15 text-molten-amber border-molten-amber/30 inline-flex items-center gap-1">
					<RocketIcon className="size-2.5" />
					Launchpad
				</Badge>
			)}
			{topHolderPct > 80 ? (
				<Badge className="bg-red-500/15 text-red-400 border-red-500/30 inline-flex items-center gap-1">
					<AlertTriangleIcon className="size-2.5" />
					{topHolderPct}%
				</Badge>
			) : topHolderPct > 50 ? (
				<Badge className="bg-yellow-500/15 text-yellow-400 border-yellow-500/30 inline-flex items-center gap-1">
					<AlertTriangleIcon className="size-2.5" />
					{topHolderPct}%
				</Badge>
			) : null}
		</div>
	);
}
