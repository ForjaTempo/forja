"use client";

import { FlameIcon, TrendingUpIcon, UsersIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { TokenEnriched } from "@/actions/token-hub";
import { Card, CardContent } from "@/components/ui/card";
import { ImageFallback } from "@/components/ui/image-fallback";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { cn } from "@/lib/utils";

const formatter = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

interface TrendingRowProps {
	tokens: TokenEnriched[];
}

export function TrendingRow({ tokens }: TrendingRowProps) {
	if (tokens.length === 0) return null;

	return (
		<ScrollReveal>
			<section className="space-y-3">
				<div className="flex items-center gap-2">
					<FlameIcon className="size-4 text-molten-amber" />
					<h2 className="text-sm font-semibold uppercase tracking-wider text-smoke">Trending</h2>
					<span className="text-xs text-smoke-dark">last 7d</span>
				</div>

				<div className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-anvil-gray-light">
					{tokens.map((token, i) => (
						<TrendingCard key={token.address} token={token} rank={i + 1} />
					))}
				</div>
			</section>
		</ScrollReveal>
	);
}

function TrendingCard({ token, rank }: { token: TokenEnriched; rank: number }) {
	const delta = token.holderDelta7d ?? 0;
	const deltaColor =
		delta > 0 ? "text-emerald-400" : delta < 0 ? "text-red-400" : "text-smoke-dark";
	const deltaSign = delta > 0 ? "+" : "";

	return (
		<Link
			href={`/tokens/${token.address}`}
			className="shrink-0 snap-start"
			style={{ scrollSnapAlign: "start" }}
		>
			<Card variant="interactive" className="w-[220px] border-anvil-gray-light bg-deep-charcoal">
				<CardContent className="space-y-3 p-4">
					<div className="flex items-center justify-between">
						<span className="inline-flex items-center justify-center rounded-md bg-indigo/10 px-1.5 py-0.5 font-mono text-xs text-indigo">
							#{rank}
						</span>
						{rank <= 3 && <FlameIcon className="size-3.5 text-molten-amber" />}
					</div>
					<div className="flex items-center gap-3">
						{token.logoUri ? (
							<Image
								src={token.logoUri}
								alt={token.symbol}
								width={36}
								height={36}
								className="rounded-full"
							/>
						) : (
							<ImageFallback name={token.symbol} size={36} variant="circle" />
						)}
						<div className="min-w-0">
							<p className="truncate text-sm font-semibold text-steel-white">{token.name}</p>
							<p className="truncate text-xs text-smoke-dark">${token.symbol}</p>
						</div>
					</div>
					<div className="flex items-center justify-between text-xs">
						<span className="inline-flex items-center gap-1 text-smoke-dark">
							<UsersIcon className="size-3" />
							{formatter.format(token.holderCount)}
						</span>
						<span className={cn("inline-flex items-center gap-1 font-mono", deltaColor)}>
							<TrendingUpIcon className="size-3" />
							{deltaSign}
							{delta} 7d
						</span>
					</div>
				</CardContent>
			</Card>
		</Link>
	);
}
