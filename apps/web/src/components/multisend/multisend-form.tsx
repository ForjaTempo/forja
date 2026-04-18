"use client";

import { type FormEvent, useCallback, useMemo, useRef, useState } from "react";
import { formatUnits, type Hex, parseUnits } from "viem";
import { useAccount } from "wagmi";
import { TransactionStatus } from "@/components/ui/transaction-status";
import { useMultisend } from "@/hooks/use-multisend";
import { useMultisendFee } from "@/hooks/use-multisend-fee";
import { useTokenApproval } from "@/hooks/use-token-approval";
import { useTokenBalance } from "@/hooks/use-token-balance";
import { useTokenInfo } from "@/hooks/use-token-info";
import { useTransactionEffects } from "@/hooks/use-transaction-effects";
import { useUsdcApproval } from "@/hooks/use-usdc-approval";
import { useUsdcBalance } from "@/hooks/use-usdc-balance";
import { TIP20_DECIMALS } from "@/lib/constants";
import { multisendConfig } from "@/lib/contracts";
import { deriveTxState, formatErrorMessage } from "@/lib/format";
import { cn } from "@/lib/utils";
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

const labelCls = "font-mono text-[11px] uppercase tracking-[0.12em] text-text-tertiary";
const inputCls =
	"w-full rounded-xl border border-border-hair bg-bg-field px-4 py-3 text-[15px] text-text-primary placeholder:text-text-tertiary focus:border-gold/60 focus:outline-none transition-colors";

interface MultisendFormProps {
	onSuccess?: (data: {
		tokenSymbol: string;
		recipientCount: number;
		totalAmount: bigint;
		txHash: string;
	}) => void;
	initialToken?: string;
}

export function MultisendForm({ onSuccess, initialToken }: MultisendFormProps) {
	const { isConnected } = useAccount();
	const [tokenAddress, setTokenAddress] = useState(initialToken ?? "");
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

	const isEqual = distribution === "equal";

	const baseParsed = useMemo<ParseResult>(
		() =>
			inputMode === "paste"
				? parseLines(recipientText, isEqual)
				: parseManualRows(manualRows, isEqual),
		[inputMode, recipientText, manualRows, isEqual],
	);

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

	const txState = deriveTxState(isSending, isConfirming, isSuccess, error);

	useTransactionEffects({
		txHash,
		isConfirming,
		isSuccess,
		error,
		onSuccess: () => {
			if (txHash) {
				successFired.current = true;
				setTxDialogOpen(false);
				onSuccess?.({
					tokenSymbol: tokenSymbol ?? "tokens",
					recipientCount: parsed.recipients.length,
					totalAmount: parsed.totalAmount,
					txHash,
				});
			}
		},
	});

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
			<form onSubmit={handleSubmit} className="space-y-6">
				<div className="space-y-2">
					<label htmlFor="token-address" className={labelCls}>
						Token address
					</label>
					<input
						id="token-address"
						type="text"
						placeholder="0x…"
						value={tokenAddress}
						onChange={(e) => setTokenAddress(e.target.value)}
						autoComplete="off"
						spellCheck={false}
						className={cn(inputCls, "font-mono text-[14px]")}
					/>
					{validTokenAddress && isTokenInfoLoading && (
						<p className="text-[12px] text-text-tertiary">Loading token info…</p>
					)}
					{validTokenAddress && isTokenError && (
						<p className="text-[12px] text-red">
							Invalid token address — could not read token contract.
						</p>
					)}
					{nonStandardDecimals && (
						<p className="text-[12px] text-red">
							This token uses {tokenDecimals} decimals instead of 6. Only TIP-20 tokens (6 decimals)
							are supported.
						</p>
					)}
					{validTokenAddress && tokenName && tokenSymbol && !nonStandardDecimals && (
						<div className="flex items-center gap-2 text-[13px]">
							<span className="text-text-secondary">{tokenName}</span>
							<span className="rounded bg-bg-elevated px-1.5 py-0.5 font-mono text-[10px] text-gold uppercase tracking-[0.1em]">
								{tokenSymbol}
							</span>
							{tokenBalanceFormatted !== undefined && (
								<span className="ml-auto font-mono text-[12px] text-text-tertiary">
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

				<div className="space-y-2">
					<span className={labelCls}>Distribution</span>
					<div
						className="flex gap-1 rounded-xl border border-border-hair bg-bg-field p-1"
						role="tablist"
						aria-label="Amount distribution"
					>
						<button
							type="button"
							role="tab"
							aria-selected={distribution === "custom"}
							className={cn(
								"flex-1 rounded-lg px-3 py-2 text-[12.5px] font-medium transition-colors",
								distribution === "custom"
									? "bg-bg-elevated text-text-primary"
									: "text-text-tertiary hover:text-text-secondary",
							)}
							onClick={() => setDistribution("custom")}
						>
							Custom amounts
						</button>
						<button
							type="button"
							role="tab"
							aria-selected={distribution === "equal"}
							className={cn(
								"flex-1 rounded-lg px-3 py-2 text-[12.5px] font-medium transition-colors",
								distribution === "equal"
									? "bg-bg-elevated text-text-primary"
									: "text-text-tertiary hover:text-text-secondary",
							)}
							onClick={() => setDistribution("equal")}
						>
							Equal split
						</button>
					</div>
					{isEqual && (
						<div className="space-y-1.5">
							<label htmlFor="equal-total" className="sr-only">
								Total amount to distribute
							</label>
							<input
								id="equal-total"
								type="text"
								placeholder="Total amount to distribute"
								value={equalTotalAmount}
								onChange={(e) => setEqualTotalAmount(e.target.value)}
								inputMode="decimal"
								autoComplete="off"
								className={cn(inputCls, "font-mono")}
							/>
							{baseParsed.recipients.length > 0 &&
								equalTotalAmount &&
								VALID_AMOUNT.test(equalTotalAmount) && (
									<p className="text-[12px] text-text-tertiary">
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

				<div className="space-y-2 border-border-hair border-t pt-5">
					<div className="flex items-center justify-between text-[13px]">
						<span className={labelCls}>Multisend fee</span>
						<span className="font-mono text-text-primary">{feeFormatted} USDC</span>
					</div>
					{isConnected && (
						<div className="flex items-center justify-between text-[13px]">
							<span className={labelCls}>Your balance</span>
							<span className="font-mono text-text-secondary">
								{usdcBalanceFormatted !== undefined
									? `${Number.parseFloat(usdcBalanceFormatted).toLocaleString("en-US", { maximumFractionDigits: 2 })} USDC`
									: "—"}
							</span>
						</div>
					)}
					{insufficientUsdc && (
						<p className="text-[12px] text-red">
							Insufficient USDC balance to cover the multisend fee.
						</p>
					)}
					{insufficientToken && (
						<p className="text-[12px] text-red">
							Insufficient {tokenSymbol ?? "token"} balance to cover the total send amount.
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

			<TransactionStatus
				open={txDialogOpen && txState !== "idle"}
				onOpenChange={handleTxDialogClose}
				state={txState}
				txHash={txHash}
				title="Dispatching batch"
				onRetry={error ? handleRetry : undefined}
				error={error ? formatErrorMessage(error, 120) : undefined}
			/>
		</>
	);
}
