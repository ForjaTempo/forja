"use client";

import { ExternalLinkIcon, InfoIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const UNISWAP_CONTRACTS = [
	{ name: "PoolManager", address: "0x..." },
	{ name: "PositionManager", address: "0x..." },
	{ name: "Permit2", address: "0x000000000022D473030F116dDEE9F6B43aC78BA3" },
] as const;

export function LiquidityGuidance() {
	return (
		<Card className="border-border-hair bg-bg-elevated">
			<CardHeader className="pb-3">
				<CardTitle className="flex items-center gap-2 text-base">
					<InfoIcon className="size-4 text-ember" />
					Add Liquidity
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="rounded-lg border border-gold/30 bg-gold/5 p-3">
					<p className="text-sm text-text-secondary">
						Uniswap v4 is live on Tempo! The web interface is coming soon.
					</p>
					<p className="mt-1 text-xs text-text-tertiary">
						Once the Uniswap web app supports Tempo, you will be able to create pools and add
						liquidity directly from the UI.
					</p>
				</div>

				<div className="space-y-2">
					<h4 className="text-sm font-medium text-text-secondary">General Steps</h4>
					<ol className="space-y-1.5 text-xs text-text-tertiary">
						<li className="flex gap-2">
							<span className="shrink-0 text-ember">1.</span>
							<span>Connect your wallet to the Uniswap interface on Tempo</span>
						</li>
						<li className="flex gap-2">
							<span className="shrink-0 text-ember">2.</span>
							<span>Create a new pool with your token and a base token (e.g., USDC)</span>
						</li>
						<li className="flex gap-2">
							<span className="shrink-0 text-ember">3.</span>
							<span>Set initial price and add liquidity</span>
						</li>
						<li className="flex gap-2">
							<span className="shrink-0 text-ember">4.</span>
							<span>Approve token transfers and confirm the transaction</span>
						</li>
					</ol>
				</div>

				<div className="space-y-2">
					<h4 className="text-sm font-medium text-text-secondary">Tempo Uniswap Contracts</h4>
					<div className="space-y-1">
						{UNISWAP_CONTRACTS.map((contract) => (
							<div key={contract.name} className="flex items-center justify-between text-xs">
								<span className="text-text-tertiary">{contract.name}</span>
								<span className="font-mono text-text-secondary">
									{contract.address.slice(0, 8)}...{contract.address.slice(-6)}
								</span>
							</div>
						))}
					</div>
				</div>

				<a
					href="https://docs.uniswap.org/contracts/v4/overview"
					target="_blank"
					rel="noopener noreferrer"
					className="inline-flex items-center gap-1 text-xs text-ember transition-colors hover:text-ember/80"
				>
					Learn more about Uniswap v4
					<ExternalLinkIcon className="size-3" />
				</a>
			</CardContent>
		</Card>
	);
}
