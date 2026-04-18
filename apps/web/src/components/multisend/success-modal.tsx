"use client";

import { ExternalLinkIcon, SendIcon } from "lucide-react";
import { formatUnits } from "viem";
import { Dialog, DialogContent } from "@/components/ui/dialog";
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
			<DialogContent className="max-h-[90vh] overflow-y-auto border-border-subtle bg-bg-elevated sm:max-w-md">
				<div className="mb-4 flex items-center gap-2 font-mono text-[11px] text-green uppercase tracking-[0.2em]">
					<span
						aria-hidden
						className="size-1.5 animate-[ember-flicker_2s_ease-in-out_infinite] rounded-full bg-green shadow-[0_0_8px_var(--color-green)]"
					/>
					Dispatched
				</div>
				<h2 className="font-display text-[28px] leading-[1.1] tracking-[-0.02em]">
					{recipientCount} {recipientCount === 1 ? "wallet" : "wallets"}{" "}
					<span className="gold-text italic">just got paid.</span>
				</h2>
				<p className="mt-2 font-mono text-[13px] text-text-secondary">${tokenSymbol}</p>

				<div className="mt-5 space-y-3 rounded-xl border border-border-hair bg-bg-field/60 p-4">
					<div className="flex items-center justify-between text-[13px]">
						<span className="font-mono text-[10px] text-text-tertiary uppercase tracking-[0.14em]">
							Recipients
						</span>
						<span className="font-mono text-text-primary">{recipientCount}</span>
					</div>
					<div className="flex items-center justify-between text-[13px]">
						<span className="font-mono text-[10px] text-text-tertiary uppercase tracking-[0.14em]">
							Total
						</span>
						<span className="font-mono text-text-primary">
							{formatUnits(totalAmount, TIP20_DECIMALS)} {tokenSymbol}
						</span>
					</div>
					<div className="flex items-center justify-between text-[13px]">
						<span className="font-mono text-[10px] text-text-tertiary uppercase tracking-[0.14em]">
							Transaction
						</span>
						<a
							href={`${explorerUrl}/tx/${txHash}`}
							target="_blank"
							rel="noopener noreferrer"
							className="inline-flex items-center gap-1 font-mono text-text-secondary transition-colors hover:text-gold"
						>
							{`${txHash.slice(0, 8)}…${txHash.slice(-6)}`}
							<ExternalLinkIcon className="size-3" />
						</a>
					</div>
				</div>

				<div className="mt-6 flex gap-3">
					<a
						href={`${explorerUrl}/tx/${txHash}`}
						target="_blank"
						rel="noopener noreferrer"
						className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-border-hair bg-bg-elevated px-4 py-3 font-medium text-[13px] text-text-secondary transition-colors hover:border-border-subtle hover:text-text-primary"
					>
						<ExternalLinkIcon className="size-4" />
						View on explorer
					</a>
					<button
						type="button"
						onClick={onSendAnother}
						className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 font-semibold text-[#1a1307] text-[13px] transition-transform hover:-translate-y-0.5"
						style={{
							background: "linear-gradient(135deg, #ffe5a8, #f0d38a 50%, #e8b860)",
							boxShadow: "0 4px 20px rgba(240,211,138,0.3), inset 0 1px 0 rgba(255,255,255,0.5)",
						}}
					>
						<SendIcon className="size-4" />
						Send another
					</button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
