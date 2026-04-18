"use client";

import { ExternalLinkIcon } from "lucide-react";
import { formatUnits } from "viem";
import { useAccount } from "wagmi";
import { AddressDisplay } from "@/components/ui/address-display";
import { Skeleton } from "@/components/ui/skeleton";
import { useExplorerUrl } from "@/hooks/use-explorer-url";
import { type MultisendEvent, useMultisendHistory } from "@/hooks/use-multisend-history";
import { TIP20_DECIMALS } from "@/lib/constants";
import { formatUnixDate } from "@/lib/format";

function SendRow({ send, explorerUrl }: { send: MultisendEvent; explorerUrl: string }) {
	return (
		<div className="rounded-xl border border-border-hair bg-bg-field/60 px-4 py-3 transition-colors hover:border-border-subtle">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<span className="font-display text-[16px] tracking-[-0.01em] text-text-primary">
						{Number(send.recipientCount)}{" "}
						{Number(send.recipientCount) === 1 ? "recipient" : "recipients"}
					</span>
					<span className="rounded bg-bg-elevated px-1.5 py-0.5 font-mono text-[10px] text-gold uppercase tracking-[0.1em]">
						{formatUnits(send.totalAmount, TIP20_DECIMALS)} tokens
					</span>
				</div>
				<span className="font-mono text-[11px] text-text-tertiary">
					{formatUnixDate(send.timestamp)}
				</span>
			</div>
			<div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px]">
				<div className="flex items-center gap-1 text-text-tertiary">
					<span>Token</span>
					<AddressDisplay address={send.token} showExplorer />
				</div>
				<a
					href={`${explorerUrl}/tx/${send.txHash}`}
					target="_blank"
					rel="noopener noreferrer"
					className="inline-flex items-center gap-1 font-mono text-text-tertiary transition-colors hover:text-gold"
				>
					{`${send.txHash.slice(0, 8)}…${send.txHash.slice(-6)}`}
					<ExternalLinkIcon className="size-3" />
				</a>
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
		<div className="rounded-2xl border border-border-hair bg-bg-elevated p-5">
			<div className="mb-4 font-mono text-[10px] text-text-tertiary uppercase tracking-[0.14em]">
				Your multisends
			</div>
			{isLoading ? (
				<div className="space-y-3">
					{Array.from({ length: 3 }).map((_, i) => (
						<Skeleton key={`skeleton-${i.toString()}`} className="h-16 w-full rounded-xl" />
					))}
				</div>
			) : sends.length === 0 ? (
				<p className="py-6 text-center text-[13px] text-text-tertiary">
					No multisends yet. Dispatch your first batch above.
				</p>
			) : (
				<div className="space-y-3">
					{sends.map((send) => (
						<SendRow key={send.txHash} send={send} explorerUrl={explorerUrl} />
					))}
				</div>
			)}
		</div>
	);
}
