"use client";

import { ExternalLinkIcon } from "lucide-react";
import { useAccount } from "wagmi";
import { AddressDisplay } from "@/components/ui/address-display";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { type CreatedTokenEvent, useCreatedTokens } from "@/hooks/use-created-tokens";
import { useExplorerUrl } from "@/hooks/use-explorer-url";
import { formatSupply, formatUnixDate } from "@/lib/format";

function TokenRow({ token, explorerUrl }: { token: CreatedTokenEvent; explorerUrl: string }) {
	return (
		<div className="rounded-lg border border-anvil-gray-light bg-obsidian-black/50 px-4 py-3">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<span className="text-sm font-medium text-smoke">{token.name}</span>
					<span className="rounded bg-anvil-gray px-1.5 py-0.5 font-mono text-xs text-smoke-dark">
						{token.symbol}
					</span>
				</div>
				<span className="text-xs text-smoke-dark">{formatUnixDate(token.timestamp)}</span>
			</div>
			<div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
				<div className="flex items-center gap-1 text-xs text-smoke-dark">
					<span>Address:</span>
					<AddressDisplay address={token.address} showExplorer />
				</div>
				<div className="flex items-center gap-1 text-xs text-smoke-dark">
					<span>Supply:</span>
					<span className="font-mono text-smoke">
						{formatSupply(token.initialSupply)} {token.symbol}
					</span>
				</div>
				<div className="flex items-center gap-1 text-xs text-smoke-dark">
					<span>Tx:</span>
					<a
						href={`${explorerUrl}/tx/${token.txHash}`}
						target="_blank"
						rel="noopener noreferrer"
						className="inline-flex items-center gap-1 font-mono text-smoke transition-colors hover:text-indigo"
					>
						{`${token.txHash.slice(0, 8)}...${token.txHash.slice(-6)}`}
						<ExternalLinkIcon className="size-3" />
					</a>
				</div>
			</div>
		</div>
	);
}

export function TokensList() {
	const { isConnected } = useAccount();
	const explorerUrl = useExplorerUrl();
	const { tokens, isLoading } = useCreatedTokens();

	if (!isConnected) return null;

	return (
		<Card className="border-anvil-gray-light bg-deep-charcoal">
			<CardHeader>
				<CardTitle className="text-lg">Your Created Tokens</CardTitle>
			</CardHeader>
			<CardContent>
				{isLoading ? (
					<div className="space-y-3">
						{Array.from({ length: 3 }).map((_, i) => (
							<Skeleton key={`skeleton-${i.toString()}`} className="h-16 w-full" />
						))}
					</div>
				) : tokens.length === 0 ? (
					<p className="py-6 text-center text-sm text-smoke-dark">
						No tokens created yet. Create your first token above.
					</p>
				) : (
					<div className="space-y-3">
						{tokens.map((token) => (
							<TokenRow key={token.txHash} token={token} explorerUrl={explorerUrl} />
						))}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
