"use client";

import { ExternalLinkIcon, SendIcon } from "lucide-react";
import { formatUnits } from "viem";
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
import { TIP20_DECIMALS } from "@/lib/constants";

interface SuccessModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	tokenSymbol: string;
	recipientCount: number;
	totalAmount: bigint;
	txHash: string;
	onSendAnother: () => void;
}

export function SuccessModal({
	open,
	onOpenChange,
	tokenSymbol,
	recipientCount,
	totalAmount,
	txHash,
	onSendAnother,
}: SuccessModalProps) {
	const explorerUrl = useExplorerUrl();

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Tokens Sent</DialogTitle>
					<DialogDescription>
						Successfully sent <span className="font-semibold text-smoke">{tokenSymbol}</span> to{" "}
						{recipientCount} {recipientCount === 1 ? "recipient" : "recipients"}.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-4">
					<div className="space-y-3 rounded-lg border border-anvil-gray-light bg-obsidian-black/50 p-4">
						<div className="flex items-center justify-between">
							<span className="text-sm text-smoke-dark">Token</span>
							<span className="text-sm font-medium text-smoke">{tokenSymbol}</span>
						</div>
						<div className="flex items-center justify-between">
							<span className="text-sm text-smoke-dark">Recipients</span>
							<span className="text-sm font-medium text-smoke">{recipientCount}</span>
						</div>
						<div className="flex items-center justify-between">
							<span className="text-sm text-smoke-dark">Total Amount</span>
							<span className="font-mono text-sm font-medium text-smoke">
								{formatUnits(totalAmount, TIP20_DECIMALS)} {tokenSymbol}
							</span>
						</div>
						<div className="flex items-center justify-between">
							<span className="text-sm text-smoke-dark">Transaction</span>
							<a
								href={`${explorerUrl}/tx/${txHash}`}
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex items-center gap-1 font-mono text-sm text-smoke transition-colors hover:text-indigo"
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
					<Button className="w-full" onClick={onSendAnother}>
						<SendIcon className="size-4" />
						Send Another
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
