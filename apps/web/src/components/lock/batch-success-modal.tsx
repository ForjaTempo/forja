"use client";

import { ExternalLinkIcon, LockIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { useExplorerUrl } from "@/hooks/use-explorer-url";

interface BatchLockSuccessModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	lockIds: bigint[];
	tokenSymbol: string;
	totalAmount: string;
	count: number;
	txHash: string;
	durationDays: number;
	onCreateAnother: () => void;
	onViewLocks: () => void;
}

export function BatchLockSuccessModal({
	open,
	onOpenChange,
	lockIds,
	tokenSymbol,
	totalAmount,
	count,
	txHash,
	durationDays,
	onCreateAnother,
	onViewLocks,
}: BatchLockSuccessModalProps) {
	const explorerUrl = useExplorerUrl();

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Batch Lock Created</DialogTitle>
					<DialogDescription>
						Successfully locked{" "}
						<span className="font-semibold text-smoke">
							{totalAmount} {tokenSymbol}
						</span>{" "}
						for {count} beneficiaries
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-4">
					<div className="space-y-3 rounded-lg border border-anvil-gray-light bg-obsidian-black/50 p-4">
						<div className="flex items-center justify-between">
							<span className="text-sm text-smoke-dark">Lock IDs</span>
							<span className="font-mono text-sm font-medium text-smoke">
								#{lockIds[0]?.toString() ?? "?"}
								{lockIds.length > 1 && ` — #${lockIds[lockIds.length - 1]?.toString()}`}
							</span>
						</div>
						<div className="flex items-center justify-between">
							<span className="text-sm text-smoke-dark">Token</span>
							<span className="text-sm font-medium text-smoke">{tokenSymbol}</span>
						</div>
						<div className="flex items-center justify-between">
							<span className="text-sm text-smoke-dark">Total Amount</span>
							<span className="font-mono text-sm font-medium text-smoke">
								{totalAmount} {tokenSymbol}
							</span>
						</div>
						<div className="flex items-center justify-between">
							<span className="text-sm text-smoke-dark">Beneficiaries</span>
							<span className="text-sm font-medium text-smoke">{count}</span>
						</div>
						<div className="flex items-center justify-between">
							<span className="text-sm text-smoke-dark">Duration</span>
							<span className="text-sm text-smoke">{durationDays} days</span>
						</div>
						<div className="flex items-center justify-between">
							<span className="text-sm text-smoke-dark">Transaction</span>
							<a
								href={`${explorerUrl}/tx/${txHash}`}
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex items-center gap-1 font-mono text-sm text-smoke transition-colors hover:text-molten-amber"
							>
								{`${txHash.slice(0, 8)}...${txHash.slice(-6)}`}
								<ExternalLinkIcon className="size-3" />
							</a>
						</div>
					</div>
				</div>

				<DialogFooter className="flex-col gap-2 sm:flex-col">
					<Button
						variant="outline"
						className="w-full"
						onClick={() => window.open(`${explorerUrl}/tx/${txHash}`, "_blank")}
					>
						<ExternalLinkIcon className="size-4" />
						View on Explorer
					</Button>
					<Button variant="outline" className="w-full" onClick={onViewLocks}>
						<LockIcon className="size-4" />
						View My Locks
					</Button>
					<Button className="w-full" onClick={onCreateAnother}>
						<PlusIcon className="size-4" />
						Create Another Lock
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
