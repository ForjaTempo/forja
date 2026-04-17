"use client";

import { ArrowRightLeftIcon, TrendingDownIcon, TrendingUpIcon, UsersIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { TokenEnriched } from "@/actions/token-hub";
import { AddressDisplay } from "@/components/ui/address-display";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ImageFallback } from "@/components/ui/image-fallback";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { TokenCardBadges } from "./trust-badges";

const formatter = new Intl.NumberFormat("en-US");

interface TokenCardProps {
	token: TokenEnriched;
	action?: React.ReactNode;
}

function formatPrice(price: string): string {
	const n = Number(price);
	if (!Number.isFinite(n) || n === 0) return "—";
	if (n >= 0.01) return `$${n.toFixed(4)}`;
	return `$${n.toExponential(2)}`;
}

export function TokenCard({ token, action }: TokenCardProps) {
	const delta = token.holderDelta7d;
	const showDelta = delta !== null && delta !== 0;
	const deltaPositive = (delta ?? 0) > 0;

	return (
		<Link href={`/tokens/${token.address}`}>
			<Card
				variant="interactive"
				className="border-anvil-gray-light bg-deep-charcoal hover:border-indigo/50"
			>
				<CardContent className="p-4">
					<div className="flex items-start justify-between gap-2">
						<div className="flex items-center gap-3">
							{token.logoUri ? (
								<Image
									src={token.logoUri}
									alt={token.symbol}
									width={40}
									height={40}
									className="rounded-full"
								/>
							) : (
								<ImageFallback name={token.symbol} size={40} variant="circle" />
							)}
							<div>
								<h3 className="text-sm font-semibold text-steel-white">{token.name}</h3>
								<p className="text-xs text-smoke-dark">
									{token.symbol}
									{token.creatorDisplayName && (
										<span className="text-smoke-dark/60"> by {token.creatorDisplayName}</span>
									)}
								</p>
							</div>
						</div>
						<div className="flex items-start gap-2">
							<TokenCardBadges
								isForjaCreated={token.isForjaCreated}
								isLaunchpadToken={token.isLaunchpadToken}
								topHolderPct={token.topHolderPct}
							/>
							{action}
						</div>
					</div>

					<div className="mt-3">
						<AddressDisplay address={token.address} />
					</div>

					{token.currentPrice && token.isLaunchpadToken && (
						<div className="mt-3 inline-flex items-center gap-1 rounded-md bg-indigo/10 px-2 py-0.5 font-mono text-xs text-indigo">
							{formatPrice(token.currentPrice)}
						</div>
					)}

					<div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-smoke-dark">
						<span className="inline-flex items-center gap-1">
							<UsersIcon className="size-3" />
							{formatter.format(token.holderCount)} holders
						</span>
						<span className="inline-flex items-center gap-1">
							<ArrowRightLeftIcon className="size-3" />
							{formatter.format(token.transferCount)} transfers
						</span>
						{showDelta && (
							<span
								className={cn(
									"inline-flex items-center gap-1 font-mono",
									deltaPositive ? "text-emerald-400" : "text-red-400",
								)}
							>
								{deltaPositive ? (
									<TrendingUpIcon className="size-3" />
								) : (
									<TrendingDownIcon className="size-3" />
								)}
								{deltaPositive ? "+" : ""}
								{delta} 7d
							</span>
						)}
					</div>

					{token.tags && token.tags.length > 0 && (
						<div className="mt-2 flex flex-wrap gap-1">
							{token.tags.map((tag) => (
								<Badge key={tag} variant="outline" className="text-[10px]">
									{tag}
								</Badge>
							))}
						</div>
					)}

					<p className="mt-2 text-xs text-smoke-dark">
						{token.isForjaCreated ? "Created" : "Listed"} {formatDate(token.createdAt)}
					</p>
				</CardContent>
			</Card>
		</Link>
	);
}
