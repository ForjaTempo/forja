"use client";

import { CoinsIcon, ExternalLinkIcon, UsersIcon, ArrowRightLeftIcon, ClockIcon } from "lucide-react";
import Link from "next/link";
import type { TokenHubCache } from "@forja/db";
import { AddressDisplay } from "@/components/ui/address-display";
import { Badge } from "@/components/ui/badge";
import { useExplorerUrl } from "@/hooks/use-explorer-url";
import { formatDate } from "@/lib/format";
import { formatSupply } from "@/lib/format";

const formatter = new Intl.NumberFormat("en-US");

interface TokenOverviewProps {
	token: TokenHubCache;
}

export function TokenOverview({ token }: TokenOverviewProps) {
	const explorerUrl = useExplorerUrl();

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-start gap-4">
				{token.logoUri ? (
					<img src={token.logoUri} alt={token.symbol} className="size-14 rounded-full" />
				) : (
					<div className="flex size-14 items-center justify-center rounded-full bg-anvil-gray">
						<CoinsIcon className="size-7 text-smoke-dark" />
					</div>
				)}
				<div className="flex-1">
					<div className="flex items-center gap-2">
						<h1 className="text-2xl font-bold text-steel-white">{token.name}</h1>
						<span className="text-lg text-smoke-dark">{token.symbol}</span>
						{token.isForjaCreated && (
							<Badge className="bg-molten-amber/15 text-molten-amber border-molten-amber/30">
								FORJA
							</Badge>
						)}
					</div>
					<div className="mt-1 flex items-center gap-2">
						<AddressDisplay address={token.address} showExplorer />
					</div>
				</div>
			</div>

			{/* Stats Grid */}
			<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
				<div className="rounded-lg border border-anvil-gray-light bg-obsidian-black/50 p-3">
					<div className="flex items-center gap-1.5 text-xs text-smoke-dark">
						<CoinsIcon className="size-3" />
						Total Supply
					</div>
					<p className="mt-1 font-mono text-sm font-semibold text-steel-white">
						{token.totalSupply ? formatSupply(BigInt(token.totalSupply)) : "—"}
					</p>
				</div>
				<div className="rounded-lg border border-anvil-gray-light bg-obsidian-black/50 p-3">
					<div className="flex items-center gap-1.5 text-xs text-smoke-dark">
						<UsersIcon className="size-3" />
						Holders
					</div>
					<p className="mt-1 font-mono text-sm font-semibold text-steel-white">
						{formatter.format(token.holderCount)}
					</p>
				</div>
				<div className="rounded-lg border border-anvil-gray-light bg-obsidian-black/50 p-3">
					<div className="flex items-center gap-1.5 text-xs text-smoke-dark">
						<ArrowRightLeftIcon className="size-3" />
						Transfers
					</div>
					<p className="mt-1 font-mono text-sm font-semibold text-steel-white">
						{formatter.format(token.transferCount)}
					</p>
				</div>
				<div className="rounded-lg border border-anvil-gray-light bg-obsidian-black/50 p-3">
					<div className="flex items-center gap-1.5 text-xs text-smoke-dark">
						<ClockIcon className="size-3" />
						Created
					</div>
					<p className="mt-1 text-sm font-semibold text-steel-white">
						{formatDate(token.createdAt)}
					</p>
				</div>
			</div>

			{/* Links */}
			<div className="flex flex-wrap gap-3">
				{token.creatorAddress && token.isForjaCreated && (
					<Link
						href={`/creators/${token.creatorAddress}`}
						className="inline-flex items-center gap-1 text-sm text-smoke transition-colors hover:text-molten-amber"
					>
						Creator: <AddressDisplay address={token.creatorAddress} />
					</Link>
				)}
				<a
					href={`${explorerUrl}/address/${token.address}`}
					target="_blank"
					rel="noopener noreferrer"
					className="inline-flex items-center gap-1 text-sm text-smoke transition-colors hover:text-molten-amber"
				>
					View on Explorer
					<ExternalLinkIcon className="size-3" />
				</a>
			</div>
		</div>
	);
}
