"use client";

import { ExternalLinkIcon, PlusIcon } from "lucide-react";
import { AddressDisplay } from "@/components/ui/address-display";
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

interface SuccessModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	name: string;
	symbol: string;
	tokenAddress: string;
	txHash: string;
	onCreateAnother: () => void;
}

export function SuccessModal({
	open,
	onOpenChange,
	name,
	symbol,
	tokenAddress,
	txHash,
	onCreateAnother,
}: SuccessModalProps) {
	const explorerUrl = useExplorerUrl();

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Token Created</DialogTitle>
					<DialogDescription>
						Your token <span className="font-semibold text-smoke">{symbol}</span> has been
						successfully created on Tempo.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-4">
					<div className="space-y-3 rounded-lg border border-anvil-gray-light bg-obsidian-black/50 p-4">
						<div className="flex items-center justify-between">
							<span className="text-sm text-smoke-dark">Name</span>
							<span className="text-sm font-medium text-smoke">{name}</span>
						</div>
						<div className="flex items-center justify-between">
							<span className="text-sm text-smoke-dark">Symbol</span>
							<span className="text-sm font-medium text-smoke">{symbol}</span>
						</div>
						<div className="flex items-center justify-between">
							<span className="text-sm text-smoke-dark">Address</span>
							<AddressDisplay address={tokenAddress} showExplorer />
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
						onClick={() => window.open(`${explorerUrl}/address/${tokenAddress}`, "_blank")}
					>
						<ExternalLinkIcon className="size-4" />
						View on Explorer
					</Button>
					<Button className="w-full" onClick={onCreateAnother}>
						<PlusIcon className="size-4" />
						Create Another
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
