"use client";

import { ExternalLinkIcon } from "lucide-react";
import { formatUnits } from "viem";
import { useAccount } from "wagmi";
import { AddressDisplay } from "@/components/ui/address-display";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useExplorerUrl } from "@/hooks/use-explorer-url";
import { type MultisendEvent, useMultisendHistory } from "@/hooks/use-multisend-history";
import { TIP20_DECIMALS } from "@/lib/constants";
import { formatUnixDate } from "@/lib/format";

function SendRow({ send, explorerUrl }: { send: MultisendEvent; explorerUrl: string }) {
	return (
		<div className="rounded-lg border border-anvil-gray-light bg-obsidian-black/50 px-4 py-3">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<span className="text-sm font-medium text-smoke">
						{Number(send.recipientCount)}{" "}
						{Number(send.recipientCount) === 1 ? "recipient" : "recipients"}
					</span>
					<span className="rounded bg-anvil-gray px-1.5 py-0.5 font-mono text-xs text-smoke-dark">
						{formatUnits(send.totalAmount, TIP20_DECIMALS)} tokens
					</span>
				</div>
				<span className="text-xs text-smoke-dark">{formatUnixDate(send.timestamp)}</span>
			</div>
			<div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
				<div className="flex items-center gap-1 text-xs text-smoke-dark">
					<span>Token:</span>
					<AddressDisplay address={send.token} showExplorer />
				</div>
				<div className="flex items-center gap-1 text-xs text-smoke-dark">
					<span>Tx:</span>
					<a
						href={`${explorerUrl}/tx/${send.txHash}`}
						target="_blank"
						rel="noopener noreferrer"
						className="inline-flex items-center gap-1 font-mono text-smoke transition-colors hover:text-indigo"
					>
						{`${send.txHash.slice(0, 8)}...${send.txHash.slice(-6)}`}
						<ExternalLinkIcon className="size-3" />
					</a>
				</div>
			</div>
		</div>
	);
}

export function SendsList() {
	const { isConnected } = useAccount();
	const explorerUrl = useExplorerUrl();
	const { sends, isLoading } = useMultisendHistory();

	if (!isConnected) return null;

	return (
		<Card className="border-anvil-gray-light bg-deep-charcoal">
			<CardHeader>
				<CardTitle className="text-lg">Your Multisends</CardTitle>
			</CardHeader>
			<CardContent>
				{isLoading ? (
					<div className="space-y-3">
						{Array.from({ length: 3 }).map((_, i) => (
							<Skeleton key={`skeleton-${i.toString()}`} className="h-16 w-full" />
						))}
					</div>
				) : sends.length === 0 ? (
					<p className="py-6 text-center text-sm text-smoke-dark">
						No multisends yet. Send your first batch above.
					</p>
				) : (
					<div className="space-y-3">
						{sends.map((send) => (
							<SendRow key={send.txHash} send={send} explorerUrl={explorerUrl} />
						))}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
