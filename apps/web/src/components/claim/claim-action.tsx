"use client";

import { useEffect, useMemo, useState } from "react";
import { formatUnits, type Hex } from "viem";
import type { ClaimCampaignRow, ProofForWalletResult } from "@/actions/claims";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
			<Card>
				<CardContent className="py-6 text-center">
					<p className="text-sm font-medium text-foreground">
						You are not eligible for this airdrop.
					</p>
					<p className="mt-1 text-xs text-smoke-dark">
						Only addresses on the original recipient list can claim.
					</p>
				</CardContent>
			</Card>
		);
	}

	if (proof.claimedAt) {
		return (
			<Card>
				<CardContent className="space-y-2 py-6 text-center">
					<p className="text-sm font-semibold text-emerald-500">
						Already claimed: {amountFormatted} {sym}
					</p>
					<p className="text-xs text-smoke-dark">on {formatDate(proof.claimedAt)}</p>
					{proof.claimedTxHash && (
						<a
							href={`${explorerUrl}/tx/${proof.claimedTxHash}`}
							target="_blank"
							rel="noopener noreferrer"
							className="text-xs text-indigo underline"
						>
							View transaction
						</a>
					)}
				</CardContent>
			</Card>
		);
	}

	if (phase === "pending") {
		return (
			<Card>
				<CardContent className="space-y-2 py-6 text-center">
					<p className="text-sm font-medium text-foreground">
						You are eligible for {amountFormatted} {sym}
					</p>
					<p className="text-xs text-smoke-dark">Claim opens in {formatCountdown(startSec, now)}</p>
				</CardContent>
			</Card>
		);
	}

	if (phase === "ended") {
		return (
			<Card>
				<CardContent className="py-6 text-center">
					<p className="text-sm font-medium text-foreground">The claim period has ended.</p>
					{campaign.endTime && (
						<p className="mt-1 text-xs text-smoke-dark">Ended on {formatDate(campaign.endTime)}</p>
					)}
				</CardContent>
			</Card>
		);
	}

	return (
		<>
			<Card>
				<CardContent className="space-y-3 py-6">
					<p className="text-center text-sm font-medium text-foreground">
						You are eligible for {amountFormatted} {sym}
					</p>
					<Button
						type="button"
						className="w-full"
						onClick={handleClaim}
						disabled={isClaiming || isConfirming}
					>
						{isClaiming || isConfirming ? "Claiming..." : `Claim ${amountFormatted} ${sym}`}
					</Button>
				</CardContent>
			</Card>
			<TransactionStatus
				open={txDialogOpen}
				onOpenChange={(open) => {
					setTxDialogOpen(open);
					if (!open) reset();
				}}
				state={txState}
				txHash={txHash}
				title="Claim airdrop"
				error={error ? formatErrorMessage(error) : undefined}
			/>
		</>
	);
}
