"use client";

import {
	ArrowRightIcon,
	CoinsIcon,
	ExternalLinkIcon,
	GiftIcon,
	LockIcon,
	SendIcon,
} from "lucide-react";
import Link from "next/link";
import { ShareButtons } from "@/components/shared/share-buttons";
import { AddressDisplay } from "@/components/ui/address-display";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { useExplorerUrl } from "@/hooks/use-explorer-url";
import { APP_URL } from "@/lib/constants";
import { hasClaimer } from "@/lib/contracts";

interface PostCreationWizardProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	name: string;
	symbol: string;
	tokenAddress: string;
	txHash: string;
	onCreateAnother: () => void;
}

export function PostCreationWizard({
	open,
	onOpenChange,
	name,
	symbol,
	tokenAddress,
	txHash,
	onCreateAnother,
}: PostCreationWizardProps) {
	const explorerUrl = useExplorerUrl();
	const tokenUrl = `${APP_URL}/tokens/${tokenAddress}`;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Token Created!</DialogTitle>
					<DialogDescription>
						<span className="font-semibold text-smoke">{name}</span> (${symbol}) is live on Tempo.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-2">
					{/* Token details */}
					<div className="space-y-3 rounded-lg border border-anvil-gray-light bg-obsidian-black/50 p-4">
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
								className="inline-flex items-center gap-1 font-mono text-sm text-smoke transition-colors hover:text-molten-amber"
							>
								{`${txHash.slice(0, 8)}...${txHash.slice(-6)}`}
								<ExternalLinkIcon className="size-3" />
							</a>
						</div>
					</div>

					{/* What's Next */}
					<div className="space-y-2">
						<h3 className="text-sm font-medium text-smoke">What&apos;s Next?</h3>

						<Link
							href={`/multisend?token=${tokenAddress}`}
							className="flex items-center gap-3 rounded-lg border border-anvil-gray-light p-3 transition-colors hover:border-molten-amber/50 hover:bg-molten-amber/5"
						>
							<SendIcon className="size-5 shrink-0 text-molten-amber" />
							<div className="flex-1">
								<p className="text-sm font-medium text-smoke">Distribute Tokens</p>
								<p className="text-xs text-smoke-dark">
									Send tokens to multiple recipients at once
								</p>
							</div>
							<ArrowRightIcon className="size-4 text-smoke-dark" />
						</Link>

						<Link
							href={`/lock?token=${tokenAddress}`}
							className="flex items-center gap-3 rounded-lg border border-anvil-gray-light p-3 transition-colors hover:border-molten-amber/50 hover:bg-molten-amber/5"
						>
							<LockIcon className="size-5 shrink-0 text-molten-amber" />
							<div className="flex-1">
								<p className="text-sm font-medium text-smoke">Lock Team Tokens</p>
								<p className="text-xs text-smoke-dark">
									Lock tokens with vesting schedule for team or investors
								</p>
							</div>
							<ArrowRightIcon className="size-4 text-smoke-dark" />
						</Link>

						{hasClaimer && (
							<Link
								href={`/claim/create?token=${tokenAddress}`}
								className="flex items-center gap-3 rounded-lg border border-anvil-gray-light p-3 transition-colors hover:border-molten-amber/50 hover:bg-molten-amber/5"
							>
								<GiftIcon className="size-5 shrink-0 text-molten-amber" />
								<div className="flex-1">
									<p className="text-sm font-medium text-smoke">Create Claim Page</p>
									<p className="text-xs text-smoke-dark">
										Run a merkle airdrop with self-service claims
									</p>
								</div>
								<ArrowRightIcon className="size-4 text-smoke-dark" />
							</Link>
						)}

						<a
							href={`${explorerUrl}/address/${tokenAddress}`}
							target="_blank"
							rel="noopener noreferrer"
							className="flex items-center gap-3 rounded-lg border border-anvil-gray-light p-3 transition-colors hover:border-molten-amber/50 hover:bg-molten-amber/5"
						>
							<CoinsIcon className="size-5 shrink-0 text-molten-amber" />
							<div className="flex-1">
								<p className="text-sm font-medium text-smoke">View on Explorer</p>
								<p className="text-xs text-smoke-dark">Check your token on Tempo Explorer</p>
							</div>
							<ExternalLinkIcon className="size-4 text-smoke-dark" />
						</a>
					</div>

					{/* Share */}
					<div className="space-y-2">
						<h3 className="text-sm font-medium text-smoke">Share Your Token</h3>
						<ShareButtons
							url={tokenUrl}
							title={`I just created $${symbol} on FORJA!`}
							description="Token toolkit for Tempo blockchain — forja.fun"
						/>
					</div>

					{/* Actions */}
					<div className="flex gap-2 pt-2">
						<Button variant="outline" className="flex-1" onClick={onCreateAnother}>
							Create Another
						</Button>
						<Button className="flex-1" asChild>
							<Link href={`/tokens/${tokenAddress}`}>View Token Page</Link>
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
