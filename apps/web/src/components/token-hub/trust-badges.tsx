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

const badgeBase =
	"inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em]";

function getBadges(signals: TrustSignals): BadgeDef[] {
	const badges: BadgeDef[] = [];

	if (signals.isForjaCreated) {
		badges.push({
			key: "forja",
			label: "FORJA",
			description: "Created with FORJA token toolkit",
			className: "border-gold/30 bg-gold/10 text-gold",
			icon: <SparklesIcon className="size-2.5" />,
		});
	}

	if (signals.isLaunchpadToken) {
		badges.push({
			key: "launchpad",
			label: "Launchpad",
			description: "Launched via FORJA bonding curve",
			className: "border-ember/30 bg-ember/10 text-ember",
			icon: <RocketIcon className="size-2.5" />,
		});
	}

	if (signals.verified) {
		badges.push({
			key: "verified",
			label: "Verified",
			description: "Creator identity verified by FORJA team",
			className: "border-green/30 bg-green/10 text-green",
			icon: <CheckCircleIcon className="size-2.5" />,
		});
	} else if (signals.profileClaimed) {
		badges.push({
			key: "claimed",
			label: "Claimed",
			description: "Creator has claimed their profile",
			className: "border-green/30 bg-green/10 text-green",
			icon: <UserCheckIcon className="size-2.5" />,
		});
	}

	if (signals.isNew) {
		badges.push({
			key: "new",
			label: "New",
			description: "Token created less than 7 days ago",
			className: "border-indigo/30 bg-indigo/10 text-indigo",
			icon: <ZapIcon className="size-2.5" />,
		});
	}

	if (signals.isActive) {
		badges.push({
			key: "active",
			label: "Active",
			description: "Transfers in the last 7 days",
			className: "border-green/30 bg-green/10 text-green",
			icon: <ZapIcon className="size-2.5" />,
		});
	} else if (signals.isDormant) {
		badges.push({
			key: "dormant",
			label: "Dormant",
			description: "No transfers in the last 30 days",
			className: "border-border-hair bg-bg-field text-text-tertiary",
			icon: <ClockIcon className="size-2.5" />,
		});
	}

	if (signals.topHolderPct > 80) {
		badges.push({
			key: "concentration-high",
			label: `${signals.topHolderPct}% held`,
			description: "Very high concentration — top holder owns over 80% of supply",
			className: "border-red/30 bg-red/10 text-red",
			icon: <AlertTriangleIcon className="size-2.5" />,
		});
	} else if (signals.topHolderPct > 50) {
		badges.push({
			key: "concentration",
			label: `${signals.topHolderPct}% held`,
			description: "High concentration — top holder owns over 50% of supply",
			className: "border-gold/30 bg-gold/10 text-gold",
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
							<span className={`${badgeBase} ${badge.className}`}>
								{badge.icon}
								{badge.label}
							</span>
						</TooltipTrigger>
						<TooltipContent>
							<p>{badge.description}</p>
						</TooltipContent>
					</Tooltip>
				))}
				{remaining > 0 && (
					<Tooltip>
						<TooltipTrigger asChild>
							<span className={`${badgeBase} border-border-hair bg-bg-field text-text-secondary`}>
								+{remaining}
							</span>
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
				<span className={`${badgeBase} border-gold/30 bg-gold/10 text-gold`}>
					<SparklesIcon className="size-2.5" />
					FORJA
				</span>
			)}
			{isLaunchpadToken && (
				<span className={`${badgeBase} border-ember/30 bg-ember/10 text-ember`}>
					<RocketIcon className="size-2.5" />
					Launchpad
				</span>
			)}
			{topHolderPct > 80 ? (
				<span className={`${badgeBase} border-red/30 bg-red/10 text-red`}>
					<AlertTriangleIcon className="size-2.5" />
					{topHolderPct}%
				</span>
			) : topHolderPct > 50 ? (
				<span className={`${badgeBase} border-gold/30 bg-gold/10 text-gold`}>
					<AlertTriangleIcon className="size-2.5" />
					{topHolderPct}%
				</span>
			) : null}
		</div>
	);
}
