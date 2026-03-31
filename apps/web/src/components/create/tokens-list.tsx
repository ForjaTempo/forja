"use client";

import { ExternalLinkIcon } from "lucide-react";
import { useAccount } from "wagmi";
import { AddressDisplay } from "@/components/ui/address-display";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TokenAmount } from "@/components/ui/token-amount";
import { useCreatedTokens } from "@/hooks/use-created-tokens";
import { TEMPO_EXPLORER } from "@/lib/constants";

export function TokensList() {
	const { isConnected } = useAccount();
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
							<Skeleton key={`skeleton-${i.toString()}`} className="h-12 w-full" />
						))}
					</div>
				) : tokens.length === 0 ? (
					<p className="py-6 text-center text-sm text-smoke-dark">
						No tokens created yet. Create your first token above.
					</p>
				) : (
					<div className="space-y-3">
						{tokens.map((token) => (
							<div
								key={token.txHash}
								className="flex items-center justify-between rounded-lg border border-anvil-gray-light bg-obsidian-black/50 px-4 py-3"
							>
								<div className="min-w-0 flex-1">
									<div className="flex items-center gap-2">
										<span className="text-sm font-medium text-smoke">{token.name}</span>
										<span className="rounded bg-anvil-gray px-1.5 py-0.5 font-mono text-xs text-smoke-dark">
											{token.symbol}
										</span>
									</div>
									<div className="mt-1 flex items-center gap-3">
										<AddressDisplay address={token.address} showExplorer />
										<TokenAmount amount={token.initialSupply} symbol={token.symbol} />
									</div>
								</div>
								<a
									href={`${TEMPO_EXPLORER}/tx/${token.txHash}`}
									target="_blank"
									rel="noopener noreferrer"
									className="ml-3 text-smoke-dark transition-colors hover:text-molten-amber"
									title="View transaction"
								>
									<ExternalLinkIcon className="size-4" />
								</a>
							</div>
						))}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
