"use client";

import type { TokenHubCache } from "@forja/db";
import {
	ArrowRightLeftIcon,
	ClockIcon,
	CoinsIcon,
	ExternalLinkIcon,
	UsersIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { TrustSignals } from "@/actions/trust-signals";
import { AddressDisplay } from "@/components/ui/address-display";
import { ImageFallback } from "@/components/ui/image-fallback";
import { useExplorerUrl } from "@/hooks/use-explorer-url";
import { formatDate, formatSupply } from "@/lib/format";
import { TrustBadges } from "./trust-badges";

const formatter = new Intl.NumberFormat("en-US");

interface TokenOverviewProps {
	token: TokenHubCache;
	trustSignals?: TrustSignals | null;
}

export function TokenOverview({ token, trustSignals }: TokenOverviewProps) {
	const explorerUrl = useExplorerUrl();

	return (
		<div className="space-y-6">
			<div className="flex items-start gap-4">
				{token.logoUri ? (
					<Image
						src={token.logoUri}
						alt={token.symbol}
						width={56}
						height={56}
						className="size-14 rounded-full"
					/>
				) : (
					<ImageFallback name={token.symbol} size={56} variant="circle" />
				)}
				<div className="min-w-0 flex-1">
					<div className="flex flex-wrap items-center gap-2">
						<h1 className="font-display text-[28px] leading-[1.1] tracking-[-0.02em] text-text-primary sm:text-[32px]">
							{token.name}
						</h1>
						<span className="rounded bg-bg-field px-1.5 py-0.5 font-mono text-[11px] text-gold uppercase tracking-[0.12em]">
							{token.symbol}
						</span>
						{trustSignals && <TrustBadges signals={trustSignals} />}
					</div>
					<div className="mt-2">
						<AddressDisplay address={token.address} showExplorer />
					</div>
				</div>
			</div>

			<div
				className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border-hair sm:grid-cols-4"
				style={{ background: "var(--color-border-hair)" }}
			>
				<StatTile
					icon={<CoinsIcon className="size-3" />}
					label="Total supply"
					value={token.totalSupply ? formatSupply(BigInt(token.totalSupply)) : "—"}
				/>
				<StatTile
					icon={<UsersIcon className="size-3" />}
					label="Holders"
					value={formatter.format(token.holderCount)}
				/>
				<StatTile
					icon={<ArrowRightLeftIcon className="size-3" />}
					label="Transfers"
					value={formatter.format(token.transferCount)}
				/>
				<StatTile
					icon={<ClockIcon className="size-3" />}
					label={token.isForjaCreated ? "Created" : "Listed"}
					value={formatDate(token.createdAt)}
				/>
			</div>

			<div className="flex flex-wrap items-center gap-4 border-border-hair border-t pt-4 text-[13px]">
				{token.creatorAddress && token.isForjaCreated && (
					<Link
						href={`/creators/${token.creatorAddress}`}
						className="inline-flex items-center gap-1 text-text-secondary transition-colors hover:text-gold"
					>
						Creator <AddressDisplay address={token.creatorAddress} />
					</Link>
				)}
				<a
					href={`${explorerUrl}/address/${token.address}`}
					target="_blank"
					rel="noopener noreferrer"
					className="inline-flex items-center gap-1 text-text-secondary transition-colors hover:text-gold"
				>
					View on explorer
					<ExternalLinkIcon className="size-3" />
				</a>
			</div>
		</div>
	);
}

function StatTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
	return (
		<div className="bg-bg-elevated px-4 py-3.5">
			<div className="flex items-center gap-1.5 font-mono text-[10px] text-text-tertiary uppercase tracking-[0.12em]">
				{icon}
				{label}
			</div>
			<p className="mt-1.5 font-mono text-[14px] text-text-primary">{value}</p>
		</div>
	);
}
