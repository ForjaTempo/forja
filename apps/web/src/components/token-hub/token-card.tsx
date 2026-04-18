"use client";

import { ArrowRightLeftIcon, TrendingDownIcon, TrendingUpIcon, UsersIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { TokenEnriched } from "@/actions/token-hub";
import { AddressDisplay } from "@/components/ui/address-display";
import { Badge } from "@/components/ui/badge";
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
		<Link href={`/tokens/${token.address}`} className="block">
			<div className="group relative overflow-hidden rounded-2xl border border-border-hair bg-bg-elevated p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-gold/30 hover:shadow-[0_8px_40px_rgba(240,211,138,0.08)]">
				{/* Hover glow */}
				<div
					aria-hidden
					className="pointer-events-none absolute -right-10 -top-10 size-[180px] bg-[radial-gradient(circle,rgba(240,211,138,0.12),transparent_70%)] opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
				/>

				<div className="relative flex items-start justify-between gap-2">
					<div className="flex items-center gap-3">
						{token.logoUri ? (
							<Image
								src={token.logoUri}
								alt={token.symbol}
								width={44}
								height={44}
								className="size-11 rounded-full"
							/>
						) : (
							<ImageFallback name={token.symbol} size={44} variant="circle" />
						)}
						<div className="min-w-0">
							<h3 className="truncate font-display text-[20px] tracking-[-0.02em] text-text-primary">
								{token.symbol}
							</h3>
							<p className="truncate text-xs text-text-tertiary">
								{token.name}
								{token.creatorDisplayName && (
									<span className="text-text-tertiary/70"> · by {token.creatorDisplayName}</span>
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

				<div className="relative mt-3">
					<AddressDisplay address={token.address} />
				</div>

				{token.currentPrice && token.isLaunchpadToken && (
					<div className="relative mt-3 inline-flex items-center gap-1 rounded-md bg-indigo/10 px-2 py-0.5 font-mono text-xs text-indigo">
						{formatPrice(token.currentPrice)}
					</div>
				)}

				<div className="relative mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs text-text-tertiary">
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
								"inline-flex items-center gap-1",
								deltaPositive ? "text-green" : "text-red",
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
					<div className="relative mt-2 flex flex-wrap gap-1">
						{token.tags.map((tag) => (
							<Badge key={tag} variant="outline" className="text-[10px]">
								{tag}
							</Badge>
						))}
					</div>
				)}

				<p className="relative mt-2 text-xs text-text-tertiary">
					{token.isForjaCreated ? "Created" : "Listed"} {formatDate(token.createdAt)}
				</p>
			</div>
		</Link>
	);
}
