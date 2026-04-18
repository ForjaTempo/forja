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

	const accent = graduated
		? {
				border: "border-green/30",
				bg: "from-green/10 via-green/5 to-transparent",
				text: "text-green",
			}
		: {
				border: "border-indigo/30",
				bg: "from-indigo/10 via-indigo/5 to-transparent",
				text: "text-indigo",
			};

	return (
		<ScrollReveal>
			<div
				className={`overflow-hidden rounded-2xl border bg-gradient-to-r p-4 sm:p-5 ${accent.border} ${accent.bg}`}
			>
				<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
					<div className="flex items-start gap-3">
						<div
							className={`flex size-9 shrink-0 items-center justify-center rounded-full bg-bg-elevated ${accent.text}`}
						>
							{graduated ? <TrophyIcon className="size-4" /> : <RocketIcon className="size-4" />}
						</div>
						<div>
							<h3 className={`font-mono text-[11px] uppercase tracking-[0.14em] ${accent.text}`}>
								{graduated ? "Graduated · Launched via FORJA" : "Launched via FORJA"}
							</h3>
							<p className="mt-1 text-[13px] text-text-secondary">
								{graduated
									? "This token graduated from the bonding curve. Trade it on Uniswap v4 with permanent liquidity."
									: "Trade this token on the FORJA launchpad bonding curve."}
							</p>
						</div>
					</div>

					{graduated ? (
						<a
							href={uniswapUrl}
							target="_blank"
							rel="noopener noreferrer"
							className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-green/40 bg-green/10 px-4 py-2 font-medium text-[13px] text-green transition-colors hover:border-green/60 hover:bg-green/20"
						>
							Trade on Uniswap
							<ExternalLinkIcon className="size-3.5" />
						</a>
					) : (
						<Link
							href={launchUrl}
							className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-indigo/40 bg-indigo/10 px-4 py-2 font-medium text-[13px] text-indigo transition-colors hover:border-indigo/60 hover:bg-indigo/20"
						>
							Trade on launchpad
							<ExternalLinkIcon className="size-3.5" />
						</Link>
					)}
				</div>
			</div>
		</ScrollReveal>
	);
}
