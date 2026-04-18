"use client";

import { ExternalLinkIcon, LockIcon, PlusIcon } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useExplorerUrl } from "@/hooks/use-explorer-url";
import { formatDate } from "@/lib/format";

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

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[90vh] overflow-y-auto border-border-subtle bg-bg-elevated sm:max-w-md">
				<div className="mb-4 flex items-center gap-2 font-mono text-[11px] text-indigo uppercase tracking-[0.2em]">
					<span
						aria-hidden
						className="size-1.5 animate-[ember-flicker_2s_ease-in-out_infinite] rounded-full bg-indigo shadow-[0_0_8px_var(--color-indigo)]"
					/>
					Locked
				</div>
				<h2 className="font-display text-[28px] leading-[1.1] tracking-[-0.02em]">
					{amount} {tokenSymbol} <span className="gold-text italic">safely sealed on-chain.</span>
				</h2>
				<p className="mt-2 font-mono text-[13px] text-text-secondary">
					Unlocks {formatDate(endTime)}
				</p>

				<div className="mt-5 space-y-3 rounded-xl border border-border-hair bg-bg-field/60 p-4">
					<div className="flex items-center justify-between text-[13px]">
						<span className="font-mono text-[10px] text-text-tertiary uppercase tracking-[0.14em]">
							Lock ID
						</span>
						<span className="font-mono text-text-primary">#{lockId.toString()}</span>
					</div>
					<div className="flex items-center justify-between text-[13px]">
						<span className="font-mono text-[10px] text-text-tertiary uppercase tracking-[0.14em]">
							Beneficiary
						</span>
						<span className="font-mono text-text-secondary">
							{`${beneficiary.slice(0, 8)}…${beneficiary.slice(-6)}`}
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

				<div className="mt-6 flex flex-col gap-2 sm:flex-row">
					<button
						type="button"
						onClick={onViewLocks}
						className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-border-hair bg-bg-elevated px-4 py-3 font-medium text-[13px] text-text-secondary transition-colors hover:border-border-subtle hover:text-text-primary"
					>
						<LockIcon className="size-4" />
						View my locks
					</button>
					<button
						type="button"
						onClick={onCreateAnother}
						className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 font-semibold text-[#1a1307] text-[13px] transition-transform hover:-translate-y-0.5"
						style={{
							background: "linear-gradient(135deg, #ffe5a8, #f0d38a 50%, #e8b860)",
							boxShadow: "0 4px 20px rgba(240,211,138,0.3), inset 0 1px 0 rgba(255,255,255,0.5)",
						}}
					>
						<PlusIcon className="size-4" />
						Forge another
					</button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
