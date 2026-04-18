"use client";

import { FlameIcon, TrendingUpIcon, UsersIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { TokenEnriched } from "@/actions/token-hub";
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
					<FlameIcon className="size-4 text-ember" />
					<h2 className="font-mono text-[10px] text-text-tertiary uppercase tracking-[0.14em]">
						Trending
					</h2>
					<span className="font-mono text-[10px] text-text-tertiary">· 7d</span>
				</div>

				<div className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border-hair">
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
	const deltaColor = delta > 0 ? "text-green" : delta < 0 ? "text-red" : "text-text-tertiary";
	const deltaSign = delta > 0 ? "+" : "";

	return (
		<Link
			href={`/tokens/${token.address}`}
			className="shrink-0 snap-start"
			style={{ scrollSnapAlign: "start" }}
		>
			<div className="w-[220px] space-y-3 rounded-2xl border border-border-hair bg-bg-elevated p-4 transition-all hover:-translate-y-0.5 hover:border-gold/30">
				<div className="flex items-center justify-between">
					<span className="inline-flex items-center justify-center rounded-md border border-gold/30 bg-gold/10 px-1.5 py-0.5 font-mono text-[10px] text-gold">
						#{rank}
					</span>
					{rank <= 3 && <FlameIcon className="size-3.5 text-ember" />}
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
						<p className="truncate font-display text-[15px] tracking-[-0.01em] text-text-primary">
							{token.name}
						</p>
						<p className="truncate font-mono text-[11px] text-text-tertiary">${token.symbol}</p>
					</div>
				</div>
				<div className="flex items-center justify-between font-mono text-[11px]">
					<span className="inline-flex items-center gap-1 text-text-tertiary">
						<UsersIcon className="size-3" />
						{formatter.format(token.holderCount)}
					</span>
					<span className={cn("inline-flex items-center gap-1", deltaColor)}>
						<TrendingUpIcon className="size-3" />
						{deltaSign}
						{delta}
					</span>
				</div>
			</div>
		</Link>
	);
}
