"use client";

import { ArrowRightLeftIcon, RocketIcon, TrendingUpIcon } from "lucide-react";
import Link from "next/link";
import type { LaunchListItem } from "@/actions/launches";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TIP20_DECIMALS } from "@/lib/constants";
import { formatDate } from "@/lib/format";

const GRADUATION_THRESHOLD = 69_000_000_000n; // 69K USDC in raw units (6 decimals)

const formatter = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

function formatUsdc(raw: string): string {
	const n = Number(BigInt(raw)) / 10 ** TIP20_DECIMALS;
	if (n >= 1000) return `$${formatter.format(n)}`;
	return `$${n.toFixed(2)}`;
}

function getStatusBadge(launch: LaunchListItem) {
	if (launch.graduated) {
		return (
			<span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400">
				Graduated
			</span>
		);
	}
	if (launch.killed || launch.failed) {
		return (
			<span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-400">
				{launch.killed ? "Killed" : "Failed"}
			</span>
		);
	}
	return (
		<span className="inline-flex items-center gap-1 rounded-full bg-molten-amber/10 px-2 py-0.5 text-xs font-medium text-molten-amber">
			Live
		</span>
	);
}

interface LaunchCardProps {
	launch: LaunchListItem;
}

export function LaunchCard({ launch }: LaunchCardProps) {
	const raised = BigInt(launch.realUsdcRaised);
	const progressPct = Math.min(100, Number((raised * 10000n) / GRADUATION_THRESHOLD) / 100);

	return (
		<Link href={`/launch/${launch.id}`}>
			<Card className="border-anvil-gray-light bg-deep-charcoal transition-colors hover:border-molten-amber/50">
				<CardContent className="p-4">
					<div className="flex items-start justify-between gap-2">
						<div className="flex items-center gap-3">
							{launch.imageUri ? (
								// biome-ignore lint/performance/noImgElement: user-provided external URL, no remote pattern config
								<img
									src={launch.imageUri}
									alt={launch.symbol}
									className="size-10 rounded-full object-cover"
								/>
							) : (
								<div className="flex size-10 items-center justify-center rounded-full bg-anvil-gray">
									<RocketIcon className="size-5 text-smoke-dark" />
								</div>
							)}
							<div>
								<h3 className="text-sm font-semibold text-steel-white">{launch.name}</h3>
								<p className="text-xs text-smoke-dark">
									${launch.symbol}
									{launch.creatorDisplayName && (
										<span className="text-smoke-dark/60"> by {launch.creatorDisplayName}</span>
									)}
								</p>
							</div>
						</div>
						{getStatusBadge(launch)}
					</div>

					{!launch.graduated && !launch.killed && !launch.failed && (
						<div className="mt-3">
							<div className="mb-1 flex items-center justify-between text-xs text-smoke-dark">
								<span>{formatUsdc(launch.realUsdcRaised)} raised</span>
								<span>{progressPct.toFixed(1)}%</span>
							</div>
							<Progress value={progressPct} className="h-2" />
						</div>
					)}

					<div className="mt-3 flex items-center gap-4 text-xs text-smoke-dark">
						<span className="inline-flex items-center gap-1">
							<ArrowRightLeftIcon className="size-3" />
							{launch.tradeCount} trades
						</span>
						<span className="inline-flex items-center gap-1">
							<TrendingUpIcon className="size-3" />
							{formatUsdc(launch.volume24h)} 24h
						</span>
					</div>

					<p className="mt-2 text-xs text-smoke-dark">Created {formatDate(launch.createdAt)}</p>
				</CardContent>
			</Card>
		</Link>
	);
}
