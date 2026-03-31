"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatUnits, type Hex, parseUnits } from "viem";
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
import {
	type ManualRow,
	type ParseResult,
	parseLines,
	parseManualRows,
	RecipientInput,
} from "./recipient-input";
import { SendButton } from "./send-button";

type InputMode = "paste" | "manual";
type DistributionMode = "custom" | "equal";

const VALID_AMOUNT = /^\d+(\.\d{1,6})?$/;

interface MultisendFormProps {
	onSuccess?: (data: {
		tokenSymbol: string;
		recipientCount: number;
		totalAmount: bigint;
		txHash: string;
	}) => void;
}

export function MultisendForm({ onSuccess }: MultisendFormProps) {
	const { isConnected } = useAccount();
	const [tokenAddress, setTokenAddress] = useState("");
	const [recipientText, setRecipientText] = useState("");
	const [manualRows, setManualRows] = useState<ManualRow[]>([{ address: "", amount: "" }]);
	const [inputMode, setInputMode] = useState<InputMode>("paste");
	const [distribution, setDistribution] = useState<DistributionMode>("custom");
	const [equalTotalAmount, setEqualTotalAmount] = useState("");
	const successFired = useRef(false);
	const [txDialogOpen, setTxDialogOpen] = useState(false);

	const validTokenAddress =
		tokenAddress.length === 42 && tokenAddress.startsWith("0x") ? (tokenAddress as Hex) : undefined;

	const {
		name: tokenName,
		symbol: tokenSymbol,
		decimals: tokenDecimals,
		isLoading: isTokenInfoLoading,
		isError: isTokenError,
	} = useTokenInfo(validTokenAddress);
	const { balance: tokenBalance, formatted: tokenBalanceFormatted } =
		useTokenBalance(validTokenAddress);

	const { fee, formatted: feeFormatted } = useMultisendFee();
	const { balance: usdcBalance, formatted: usdcBalanceFormatted } = useUsdcBalance();
	const { txSubmitted, txFailed } = useTransactionToast();

	const isEqual = distribution === "equal";

	// Parse recipients based on input mode
	// When equal distribution, only validate addresses (addressOnly=true)
	const baseParsed = useMemo<ParseResult>(
		() =>
			inputMode === "paste"
				? parseLines(recipientText, isEqual)
				: parseManualRows(manualRows, isEqual),
		[inputMode, recipientText, manualRows, isEqual],
	);

	// Apply equal distribution if selected — uses bigint math exclusively
	const parsed = useMemo<ParseResult>(() => {
		if (!isEqual) return baseParsed;

		if (baseParsed.recipients.length === 0 || baseParsed.errors.length > 0) {
			return baseParsed;
		}

		if (
			!equalTotalAmount ||
			!VALID_AMOUNT.test(equalTotalAmount) ||
			Number(equalTotalAmount) <= 0
		) {
			return {
				...baseParsed,
				totalAmount: 0n,
				errors: equalTotalAmount ? ["Enter a valid total amount for equal distribution"] : [],
			};
		}

		const total = parseUnits(equalTotalAmount, TIP20_DECIMALS);
		const count = BigInt(baseParsed.recipients.length);
		const perRecipient = total / count;
		const remainder = total - perRecipient * count;

		if (perRecipient === 0n) {
			return {
				...baseParsed,
				totalAmount: 0n,
				errors: ["Total amount too small to split among recipients"],
			};
		}

		// Use formatUnits for bigint-safe string conversion (no Number precision loss)
		const perAmount = formatUnits(perRecipient, TIP20_DECIMALS);
		const firstAmount = formatUnits(perRecipient + remainder, TIP20_DECIMALS);

		return {
			...baseParsed,
			recipients: baseParsed.recipients.map((r, i) => ({
				...r,
				amount: i === 0 ? firstAmount : perAmount,
			})),
			totalAmount: total,
		};
	}, [isEqual, baseParsed, equalTotalAmount]);

	const feeAmount = fee ?? parseUnits(String(feeFormatted), TIP20_DECIMALS);

	// Non-standard decimals warning (Tempo TIP-20 is always 6)
	const nonStandardDecimals = tokenDecimals !== undefined && tokenDecimals !== TIP20_DECIMALS;

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
		!nonStandardDecimals &&
		parsed.recipients.length > 0 &&
		parsed.errors.length === 0 &&
		parsed.totalAmount > 0n;

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
				totalAmount: parsed.totalAmount,
				txHash,
			});
		}
	}, [isSuccess, txHash, onSuccess, tokenSymbol, parsed.recipients.length, parsed.totalAmount]);

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
							{nonStandardDecimals && (
								<p className="text-xs text-ember-red">
									This token uses {tokenDecimals} decimals instead of 6. Only TIP-20 tokens (6
									decimals) are supported.
								</p>
							)}
							{validTokenAddress && tokenName && tokenSymbol && !nonStandardDecimals && (
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

						{/* Distribution mode toggle */}
						<div className="space-y-3">
							<span className="text-sm font-medium text-smoke">Distribution</span>
							<div
								className="flex gap-1 rounded-md border border-anvil-gray-light bg-obsidian-black p-1"
								role="tablist"
								aria-label="Amount distribution"
							>
								<button
									type="button"
									role="tab"
									aria-selected={distribution === "custom"}
									className={`flex-1 rounded px-3 py-1.5 text-xs font-medium transition-colors ${
										distribution === "custom"
											? "bg-anvil-gray text-smoke"
											: "text-smoke-dark hover:text-smoke"
									}`}
									onClick={() => setDistribution("custom")}
								>
									Custom Amounts
								</button>
								<button
									type="button"
									role="tab"
									aria-selected={distribution === "equal"}
									className={`flex-1 rounded px-3 py-1.5 text-xs font-medium transition-colors ${
										distribution === "equal"
											? "bg-anvil-gray text-smoke"
											: "text-smoke-dark hover:text-smoke"
									}`}
									onClick={() => setDistribution("equal")}
								>
									Equal Split
								</button>
							</div>
							{isEqual && (
								<div className="space-y-1">
									<label htmlFor="equal-total" className="sr-only">
										Total amount to distribute
									</label>
									<Input
										id="equal-total"
										placeholder="Total amount to distribute"
										value={equalTotalAmount}
										onChange={(e) => setEqualTotalAmount(e.target.value)}
										inputMode="decimal"
										autoComplete="off"
										className="font-mono"
									/>
									{baseParsed.recipients.length > 0 &&
										equalTotalAmount &&
										VALID_AMOUNT.test(equalTotalAmount) && (
											<p className="text-xs text-smoke-dark">
												Each recipient gets ~
												{(Number(equalTotalAmount) / baseParsed.recipients.length).toFixed(6)}{" "}
												{tokenSymbol ?? "tokens"}
											</p>
										)}
								</div>
							)}
						</div>

						<RecipientInput
							value={recipientText}
							onChange={setRecipientText}
							manualRows={manualRows}
							onManualRowsChange={setManualRows}
							inputMode={inputMode}
							onInputModeChange={setInputMode}
							tokenSymbol={tokenSymbol}
							addressOnly={isEqual}
							displayParsed={isEqual ? parsed : undefined}
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
