"use client";

import { ExternalLinkIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { formatUnits, type Hex } from "viem";
import type { ClaimCampaignRow, ProofForWalletResult } from "@/actions/claims";
import { TransactionStatus } from "@/components/ui/transaction-status";
import { useClaimReward } from "@/hooks/use-claim-reward";
import { deriveTxState, formatDate, formatErrorMessage } from "@/lib/format";

interface ClaimActionProps {
	campaign: ClaimCampaignRow;
	proof: ProofForWalletResult | null;
	decimals: number;
	tokenSymbol: string | undefined;
	phase: "pending" | "live" | "ended";
	startSec: number;
	endSec: number | null;
	now: number;
	explorerUrl: string;
	onClaimed: () => void;
}

function formatCountdown(target: number, now: number): string {
	const diff = Math.max(0, target - now);
	const days = Math.floor(diff / 86400);
	const hours = Math.floor((diff % 86400) / 3600);
	const minutes = Math.floor((diff % 3600) / 60);
	const seconds = diff % 60;
	if (days > 0) return `${days}d ${hours}h ${minutes}m`;
	if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
	if (minutes > 0) return `${minutes}m ${seconds}s`;
	return `${seconds}s`;
}

export function ClaimAction({
	campaign,
	proof,
	decimals,
	tokenSymbol,
	phase,
	startSec,
	now,
	explorerUrl,
	onClaimed,
}: ClaimActionProps) {
	const [txDialogOpen, setTxDialogOpen] = useState(false);
	const { claim, isClaiming, isConfirming, isSuccess, txHash, error, reset } = useClaimReward();

	const sym = tokenSymbol ?? "";

	useEffect(() => {
		if (isSuccess) {
			onClaimed();
		}
	}, [isSuccess, onClaimed]);

	const amountFormatted = useMemo(() => {
		if (!proof) return "0";
		try {
			return formatUnits(BigInt(proof.amount), decimals);
		} catch {
			return proof.amount;
		}
	}, [proof, decimals]);

	const handleClaim = () => {
		if (!proof) return;
		setTxDialogOpen(true);
		try {
			claim(BigInt(campaign.campaignId), BigInt(proof.amount), proof.proof as Hex[]);
		} catch (err) {
			console.error("[claim] failed to invoke claim", err);
		}
	};

	const txState = deriveTxState(isClaiming, isConfirming, isSuccess, error);

	if (proof === null) {
		return (
			<div className="rounded-2xl border border-border-hair bg-bg-elevated p-8 text-center">
				<div className="mb-2 font-mono text-[10px] text-text-tertiary uppercase tracking-[0.14em]">
					Not eligible
				</div>
				<p className="font-display text-[18px] tracking-[-0.01em] text-text-primary">
					This wallet isn't on the recipient list.
				</p>
				<p className="mt-1.5 text-[12.5px] text-text-tertiary">
					Only addresses on the original merkle root can claim.
				</p>
			</div>
		);
	}

	if (proof.claimedAt) {
		return (
			<div className="rounded-2xl border border-green/30 bg-green/5 p-8 text-center">
				<div className="mb-2 inline-flex items-center gap-2 font-mono text-[11px] text-green uppercase tracking-[0.2em]">
					<span
						aria-hidden
						className="size-1.5 rounded-full bg-green shadow-[0_0_8px_var(--color-green)]"
					/>
					Claimed
				</div>
				<p className="font-display text-[22px] tracking-[-0.01em] text-text-primary">
					{amountFormatted} {sym}
				</p>
				<p className="mt-1 font-mono text-[12px] text-text-tertiary">
					{formatDate(proof.claimedAt)}
				</p>
				{proof.claimedTxHash && (
					<a
						href={`${explorerUrl}/tx/${proof.claimedTxHash}`}
						target="_blank"
						rel="noopener noreferrer"
						className="mt-3 inline-flex items-center gap-1 font-mono text-[12px] text-text-secondary transition-colors hover:text-gold"
					>
						View transaction
						<ExternalLinkIcon className="size-3" />
					</a>
				)}
			</div>
		);
	}

	if (phase === "pending") {
		return (
			<div className="rounded-2xl border border-border-hair bg-bg-elevated p-8 text-center">
				<div className="mb-2 font-mono text-[10px] text-text-tertiary uppercase tracking-[0.14em]">
					Eligible
				</div>
				<p className="font-display text-[22px] tracking-[-0.01em]">
					<span className="text-text-primary">{amountFormatted} </span>
					<span className="gold-text italic">{sym}</span>
				</p>
				<p className="mt-2 font-mono text-[12px] text-text-tertiary">
					Claim opens in {formatCountdown(startSec, now)}
				</p>
			</div>
		);
	}

	if (phase === "ended") {
		return (
			<div className="rounded-2xl border border-border-hair bg-bg-elevated p-8 text-center">
				<div className="mb-2 font-mono text-[10px] text-text-tertiary uppercase tracking-[0.14em]">
					Closed
				</div>
				<p className="font-display text-[18px] tracking-[-0.01em] text-text-primary">
					The claim period has ended.
				</p>
				{campaign.endTime && (
					<p className="mt-1.5 text-[12.5px] text-text-tertiary">
						Ended on {formatDate(campaign.endTime)}
					</p>
				)}
			</div>
		);
	}

	const claiming = isClaiming || isConfirming;
	return (
		<>
			<div className="space-y-4 rounded-2xl border border-ember/30 bg-ember/5 p-6">
				<div className="text-center">
					<div className="mb-2 inline-flex items-center gap-2 font-mono text-[11px] text-ember uppercase tracking-[0.2em]">
						<span
							aria-hidden
							className="size-1.5 animate-[ember-flicker_2s_ease-in-out_infinite] rounded-full bg-ember shadow-[0_0_8px_var(--color-ember)]"
						/>
						Eligible
					</div>
					<p className="font-display text-[28px] leading-[1.1] tracking-[-0.02em]">
						<span className="text-text-primary">{amountFormatted} </span>
						<span className="gold-text italic">{sym}</span>
					</p>
					<p className="mt-1 font-mono text-[11px] text-text-tertiary uppercase tracking-[0.12em]">
						Waiting for you
					</p>
				</div>
				<button
					type="button"
					onClick={handleClaim}
					disabled={claiming}
					className="inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 font-semibold text-[#1a1307] text-[15px] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
					style={{
						background: "linear-gradient(135deg, #ffe5a8, #f0d38a 50%, #e8b860)",
						boxShadow: "0 4px 30px rgba(240,211,138,0.3), inset 0 1px 0 rgba(255,255,255,0.5)",
					}}
				>
					{claiming ? "Claiming…" : `Claim ${amountFormatted} ${sym}`}
				</button>
			</div>
			<TransactionStatus
				open={txDialogOpen}
				onOpenChange={(open) => {
					setTxDialogOpen(open);
					if (!open) reset();
				}}
				state={txState}
				txHash={txHash}
				title="Claiming airdrop"
				error={error ? formatErrorMessage(error) : undefined}
			/>
		</>
	);
}
