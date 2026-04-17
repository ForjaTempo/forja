"use client";

import { useQuery } from "@tanstack/react-query";
import { ExternalLinkIcon, RocketIcon, TrophyIcon } from "lucide-react";
import Link from "next/link";
import { getLaunchByToken } from "@/actions/launches";
import { ScrollReveal } from "@/components/ui/scroll-reveal";

interface LaunchpadLinkProps {
	tokenAddress: string;
}

export function LaunchpadLink({ tokenAddress }: LaunchpadLinkProps) {
	const { data: launch } = useQuery({
		queryKey: ["token-launch-lookup", tokenAddress],
		queryFn: () => getLaunchByToken(tokenAddress),
		staleTime: 60_000,
	});

	if (!launch) return null;

	const graduated = launch.graduated;
	const launchUrl = `/launch/${launch.id}`;
	const uniswapUrl = `https://app.uniswap.org/swap?outputCurrency=${tokenAddress}`;

	return (
		<ScrollReveal>
			<div className="overflow-hidden rounded-xl border border-indigo/30 bg-gradient-to-r from-indigo/10 via-indigo/5 to-transparent p-4 sm:p-5">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
					<div className="flex items-start gap-3">
						<div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-indigo/20 text-indigo">
							{graduated ? <TrophyIcon className="size-4" /> : <RocketIcon className="size-4" />}
						</div>
						<div>
							<h3 className="text-sm font-semibold text-indigo">
								{graduated ? "Launched via FORJA — graduated" : "Launched via FORJA"}
							</h3>
							<p className="mt-0.5 text-xs text-smoke">
								{graduated
									? "This token graduated from the bonding curve. Trade it on Uniswap v4 with permanent liquidity."
									: "Trade this token on the FORJA Launchpad bonding curve."}
							</p>
						</div>
					</div>

					{graduated ? (
						<a
							href={uniswapUrl}
							target="_blank"
							rel="noopener noreferrer"
							className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-400 transition-colors hover:border-emerald-500/60 hover:bg-emerald-500/20"
						>
							Trade on Uniswap
							<ExternalLinkIcon className="size-3.5" />
						</a>
					) : (
						<Link
							href={launchUrl}
							className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-indigo/40 bg-indigo/10 px-4 py-2 text-sm font-medium text-indigo transition-colors hover:border-indigo/60 hover:bg-indigo/20"
						>
							Trade on Launchpad
							<ExternalLinkIcon className="size-3.5" />
						</Link>
					)}
				</div>
			</div>
		</ScrollReveal>
	);
}
