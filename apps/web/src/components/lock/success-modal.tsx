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

interface LockSuccessModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	lockId: bigint;
	tokenSymbol: string;
	amount: string;
	beneficiary: string;
	txHash: string;
	endTime: Date;
	onCreateAnother: () => void;
	onViewLocks: () => void;
}

export function LockSuccessModal({
	open,
	onOpenChange,
	lockId,
	tokenSymbol,
	amount,
	beneficiary,
	txHash,
	endTime,
	onCreateAnother,
	onViewLocks,
}: LockSuccessModalProps) {
	const explorerUrl = useExplorerUrl();

	const formatDate = (d: Date) =>
		d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Lock Created</DialogTitle>
					<DialogDescription>
						Successfully locked{" "}
						<span className="font-semibold text-smoke">
							{amount} {tokenSymbol}
						</span>
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-4">
					<div className="space-y-3 rounded-lg border border-anvil-gray-light bg-obsidian-black/50 p-4">
						<div className="flex items-center justify-between">
							<span className="text-sm text-smoke-dark">Lock ID</span>
							<span className="font-mono text-sm font-medium text-smoke">#{lockId.toString()}</span>
						</div>
						<div className="flex items-center justify-between">
							<span className="text-sm text-smoke-dark">Token</span>
							<span className="text-sm font-medium text-smoke">{tokenSymbol}</span>
						</div>
						<div className="flex items-center justify-between">
							<span className="text-sm text-smoke-dark">Amount</span>
							<span className="font-mono text-sm font-medium text-smoke">
								{amount} {tokenSymbol}
							</span>
						</div>
						<div className="flex items-center justify-between">
							<span className="text-sm text-smoke-dark">Beneficiary</span>
							<span className="font-mono text-sm text-smoke">
								{`${beneficiary.slice(0, 8)}...${beneficiary.slice(-6)}`}
							</span>
						</div>
						<div className="flex items-center justify-between">
							<span className="text-sm text-smoke-dark">Unlock date</span>
							<span className="text-sm text-smoke">{formatDate(endTime)}</span>
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
