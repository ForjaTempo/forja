"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Hex } from "viem";
import { parseUnits } from "viem";
import { useAccount } from "wagmi";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { type TransactionState, TransactionStatus } from "@/components/ui/transaction-status";
import { useMultisend } from "@/hooks/use-multisend";
import { useMultisendFee } from "@/hooks/use-multisend-fee";
import { useTokenApproval } from "@/hooks/use-token-approval";
import { useTokenBalance } from "@/hooks/use-token-balance";
import { useTokenInfo } from "@/hooks/use-token-info";
import { useTransactionToast } from "@/hooks/use-transaction-toast";
import { useUsdcApproval } from "@/hooks/use-usdc-approval";
import { useUsdcBalance } from "@/hooks/use-usdc-balance";
import { TIP20_DECIMALS } from "@/lib/constants";
import { multisendConfig } from "@/lib/contracts";
import { parseLines, RecipientInput } from "./recipient-input";
import { SendButton } from "./send-button";

interface MultisendFormProps {
	onSuccess?: (data: {
		tokenSymbol: string;
		recipientCount: number;
		totalAmount: string;
		txHash: string;
	}) => void;
}

export function MultisendForm({ onSuccess }: MultisendFormProps) {
	const { isConnected } = useAccount();
	const [tokenAddress, setTokenAddress] = useState("");
	const [recipientText, setRecipientText] = useState("");
	const successFired = useRef(false);
	const [txDialogOpen, setTxDialogOpen] = useState(false);

	const validTokenAddress =
		tokenAddress.length === 42 && tokenAddress.startsWith("0x") ? (tokenAddress as Hex) : undefined;

	const {
		name: tokenName,
		symbol: tokenSymbol,
		isLoading: isTokenInfoLoading,
		isError: isTokenError,
	} = useTokenInfo(validTokenAddress);
	const { balance: tokenBalance, formatted: tokenBalanceFormatted } =
		useTokenBalance(validTokenAddress);

	const { fee, formatted: feeFormatted } = useMultisendFee();
	const { balance: usdcBalance, formatted: usdcBalanceFormatted } = useUsdcBalance();
	const { txSubmitted, txFailed } = useTransactionToast();

	const parsed = useMemo(() => parseLines(recipientText), [recipientText]);
	const feeAmount = fee ?? parseUnits(String(feeFormatted), TIP20_DECIMALS);

	const {
		needsApproval: needsUsdcApproval,
		isAllowanceLoading: isUsdcAllowanceLoading,
		approve: approveUsdc,
		isApproving: isUsdcApproving,
		isApprovalConfirming: isUsdcApprovalConfirming,
	} = useUsdcApproval({
		spender: multisendConfig.address,
		amount: feeAmount,
	});

	const {
		needsApproval: needsTokenApproval,
		isAllowanceLoading: isTokenAllowanceLoading,
		approve: approveToken,
		isApproving: isTokenApproving,
		isApprovalConfirming: isTokenApprovalConfirming,
	} = useTokenApproval({
		tokenAddress: validTokenAddress,
		spender: multisendConfig.address,
		amount: parsed.totalAmount,
	});

	const { multisend, isSending, isConfirming, isSuccess, txHash, error, reset } = useMultisend();

	const insufficientUsdc = usdcBalance !== undefined && usdcBalance < feeAmount;
	const insufficientToken =
		tokenBalance !== undefined && parsed.totalAmount > 0n && tokenBalance < parsed.totalAmount;

	const formValid =
		validTokenAddress !== undefined &&
		!isTokenError &&
		parsed.recipients.length > 0 &&
		parsed.errors.length === 0;

	const handleSend = useCallback(() => {
		if (!formValid || !validTokenAddress) return;
		successFired.current = false;
		setTxDialogOpen(true);
		multisend(
			validTokenAddress,
			parsed.recipients.map((r) => r.address),
			parsed.recipients.map((r) => r.amount),
		);
	}, [formValid, validTokenAddress, parsed.recipients, multisend]);

	const handleSubmit = useCallback(
		(e: FormEvent) => {
			e.preventDefault();
			handleSend();
		},
		[handleSend],
	);

	// Derive TransactionStatus state
	let txState: TransactionState = "idle";
	if (isSending) txState = "waiting";
	else if (isConfirming) txState = "pending";
	else if (isSuccess) txState = "confirmed";
	else if (error) txState = "failed";

	// Toast on tx submitted
	useEffect(() => {
		if (txHash && isConfirming) {
			txSubmitted(txHash);
		}
	}, [txHash, isConfirming, txSubmitted]);

	// Toast on failure
	useEffect(() => {
		if (error) {
			txFailed(
				error.message?.includes("User rejected")
					? "Transaction rejected by user"
					: (error.message?.slice(0, 80) ?? "Transaction failed"),
			);
		}
	}, [error, txFailed]);

	// Notify parent on success
	useEffect(() => {
		if (isSuccess && txHash && !successFired.current) {
			successFired.current = true;
			setTxDialogOpen(false);
			onSuccess?.({
				tokenSymbol: tokenSymbol ?? "tokens",
				recipientCount: parsed.recipients.length,
				totalAmount: recipientText,
				txHash,
			});
		}
	}, [isSuccess, txHash, onSuccess, tokenSymbol, parsed.recipients.length, recipientText]);

	const handleRetry = useCallback(() => {
		reset();
		setTxDialogOpen(false);
		setTimeout(() => handleSend(), 0);
	}, [reset, handleSend]);

	const handleTxDialogClose = useCallback(
		(open: boolean) => {
			if (!open) {
				setTxDialogOpen(false);
				if (error) reset();
			}
		},
		[error, reset],
	);

	return (
		<>
			<Card className="border-anvil-gray-light bg-deep-charcoal">
				<CardContent>
					<form onSubmit={handleSubmit} className="space-y-5">
						<div className="space-y-2">
							<label htmlFor="token-address" className="text-sm font-medium text-smoke">
								Token Address
							</label>
							<Input
								id="token-address"
								placeholder="0x..."
								value={tokenAddress}
								onChange={(e) => setTokenAddress(e.target.value)}
								autoComplete="off"
								spellCheck={false}
								className="font-mono"
							/>
							{validTokenAddress && isTokenInfoLoading && (
								<p className="text-xs text-smoke-dark">Loading token info...</p>
							)}
							{validTokenAddress && isTokenError && (
								<p className="text-xs text-ember-red">
									Invalid token address — could not read token contract
								</p>
							)}
							{validTokenAddress && tokenName && tokenSymbol && (
								<div className="flex items-center gap-2 text-sm">
									<span className="text-smoke">{tokenName}</span>
									<span className="rounded bg-anvil-gray px-1.5 py-0.5 font-mono text-xs text-smoke-dark">
										{tokenSymbol}
									</span>
									{tokenBalanceFormatted !== undefined && (
										<span className="ml-auto font-mono text-xs text-smoke-dark">
											Balance:{" "}
											{Number.parseFloat(tokenBalanceFormatted).toLocaleString("en-US", {
												maximumFractionDigits: 2,
											})}{" "}
											{tokenSymbol}
										</span>
									)}
								</div>
							)}
						</div>

						<RecipientInput
							value={recipientText}
							onChange={setRecipientText}
							tokenSymbol={tokenSymbol}
						/>

						<Separator className="bg-anvil-gray-light" />

						<div className="space-y-2">
							<div className="flex items-center justify-between text-sm">
								<span className="text-smoke-dark">Multisend fee</span>
								<span className="font-mono text-smoke">{feeFormatted} USDC</span>
							</div>
							{isConnected && (
								<div className="flex items-center justify-between text-sm">
									<span className="text-smoke-dark">USDC balance</span>
									<span className="font-mono text-smoke">
										{usdcBalanceFormatted !== undefined
											? `${Number.parseFloat(usdcBalanceFormatted).toLocaleString("en-US", { maximumFractionDigits: 2 })} USDC`
											: "\u2014"}
									</span>
								</div>
							)}
							{insufficientUsdc && (
								<p className="text-xs text-ember-red">
									Insufficient USDC balance to cover the multisend fee
								</p>
							)}
							{insufficientToken && (
								<p className="text-xs text-ember-red">
									Insufficient {tokenSymbol ?? "token"} balance to cover the total send amount
								</p>
							)}
						</div>

						<SendButton
							needsUsdcApproval={needsUsdcApproval}
							needsTokenApproval={needsTokenApproval}
							isAllowanceLoading={isUsdcAllowanceLoading || isTokenAllowanceLoading}
							insufficientUsdc={insufficientUsdc}
							insufficientToken={insufficientToken}
							isUsdcApproving={isUsdcApproving}
							isUsdcApprovalConfirming={isUsdcApprovalConfirming}
							isTokenApproving={isTokenApproving}
							isTokenApprovalConfirming={isTokenApprovalConfirming}
							isSending={isSending}
							isConfirming={isConfirming}
							disabled={!formValid}
							tokenSymbol={tokenSymbol}
							onApproveUsdc={approveUsdc}
							onApproveToken={approveToken}
							onSend={handleSend}
						/>
					</form>
				</CardContent>
			</Card>

			<TransactionStatus
				open={txDialogOpen && txState !== "idle"}
				onOpenChange={handleTxDialogClose}
				state={txState}
				txHash={txHash}
				title="Sending Tokens"
				onRetry={error ? handleRetry : undefined}
				error={
					error
						? error.message?.includes("User rejected")
							? "Transaction rejected by user"
							: (error.message?.slice(0, 120) ?? "Transaction failed")
						: undefined
				}
			/>
		</>
	);
}
