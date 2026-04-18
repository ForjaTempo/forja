"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type Hex, isAddress, parseUnits } from "viem";
import { useAccount } from "wagmi";
import { TransactionStatus } from "@/components/ui/transaction-status";
import { useCreateLock } from "@/hooks/use-create-lock";
import { useLockFee } from "@/hooks/use-lock-fee";
import { useTokenApproval } from "@/hooks/use-token-approval";
import { useTokenBalance } from "@/hooks/use-token-balance";
import { useTokenInfo } from "@/hooks/use-token-info";
import { useTransactionEffects } from "@/hooks/use-transaction-effects";
import { useUsdcApproval } from "@/hooks/use-usdc-approval";
import { useUsdcBalance } from "@/hooks/use-usdc-balance";
import { TIP20_DECIMALS } from "@/lib/constants";
import { activeLockerConfig } from "@/lib/contracts";
import { deriveTxState, formatErrorMessage } from "@/lib/format";
import { CLIFF_PRESETS, DURATION_PRESETS } from "@/lib/lock-utils";
import { cn } from "@/lib/utils";
import { LockButton } from "./lock-button";
import { VestingPreview } from "./vesting-preview";

const VALID_AMOUNT = /^\d+(\.\d{1,6})?$/;
const VALID_DAYS = /^\d+$/;

const labelCls = "font-mono text-[11px] uppercase tracking-[0.12em] text-text-tertiary";
const inputCls =
	"w-full rounded-xl border border-border-hair bg-bg-field px-4 py-3 text-[15px] text-text-primary placeholder:text-text-tertiary focus:border-gold/60 focus:outline-none transition-colors";
const presetBtnCls = "rounded-lg border px-3 py-1.5 font-medium text-[12px] transition-colors";

interface LockFormProps {
	onSuccess?: (data: {
		lockId: bigint;
		tokenSymbol: string;
		amount: string;
		beneficiary: string;
		txHash: string;
		endTime: Date;
	}) => void;
	initialToken?: string;
}

export function LockForm({ onSuccess, initialToken }: LockFormProps) {
	const { address, isConnected } = useAccount();

	const [tokenAddress, setTokenAddress] = useState(initialToken ?? "");
	const [beneficiary, setBeneficiary] = useState(address ?? "");
	const [amount, setAmount] = useState("");
	const [durationDays, setDurationDays] = useState("");
	const [vestingEnabled, setVestingEnabled] = useState(false);
	const [cliffDays, setCliffDays] = useState("");
	const [revocable, setRevocable] = useState(false);
	const [txDialogOpen, setTxDialogOpen] = useState(false);
	const successFired = useRef(false);

	useEffect(() => {
		if (address && !beneficiary) {
			setBeneficiary(address);
		}
	}, [address, beneficiary]);

	const validTokenAddress = isAddress(tokenAddress) ? (tokenAddress as Hex) : undefined;

	const {
		name: tokenName,
		symbol: tokenSymbol,
		decimals: tokenDecimals,
		isLoading: isTokenInfoLoading,
		isError: isTokenError,
	} = useTokenInfo(validTokenAddress);
	const { balance: tokenBalance, formatted: tokenBalanceFormatted } =
		useTokenBalance(validTokenAddress);

	const { fee, formatted: feeFormatted } = useLockFee();
	const { balance: usdcBalance, formatted: usdcBalanceFormatted } = useUsdcBalance();

	const nonStandardDecimals = tokenDecimals !== undefined && tokenDecimals !== TIP20_DECIMALS;

	const parsedAmount = useMemo(() => {
		if (!amount || !VALID_AMOUNT.test(amount) || Number(amount) <= 0) return 0n;
		return parseUnits(amount, TIP20_DECIMALS);
	}, [amount]);

	const lockDurationSeconds = useMemo(() => {
		if (!durationDays || !VALID_DAYS.test(durationDays) || Number(durationDays) <= 0) return 0n;
		return BigInt(durationDays) * 86400n;
	}, [durationDays]);

	const cliffDurationSeconds = useMemo(() => {
		if (!vestingEnabled || !cliffDays || !VALID_DAYS.test(cliffDays)) return 0n;
		return BigInt(cliffDays) * 86400n;
	}, [vestingEnabled, cliffDays]);

	const feeAmount = fee ?? parseUnits(String(feeFormatted), TIP20_DECIMALS);

	const validBeneficiary = isAddress(beneficiary) ? (beneficiary as Hex) : undefined;

	const {
		needsApproval: needsUsdcApproval,
		isAllowanceLoading: isUsdcAllowanceLoading,
		approve: approveUsdc,
		isApproving: isUsdcApproving,
		isApprovalConfirming: isUsdcApprovalConfirming,
	} = useUsdcApproval({
		spender: activeLockerConfig.address,
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
		spender: activeLockerConfig.address,
		amount: parsedAmount,
	});

	const { createLock, isCreating, isConfirming, isSuccess, txHash, lockId, error, reset } =
		useCreateLock();

	const insufficientUsdc = usdcBalance !== undefined && usdcBalance < feeAmount;
	const insufficientToken =
		tokenBalance !== undefined && parsedAmount > 0n && tokenBalance < parsedAmount;
	const cliffExceedsDuration =
		cliffDurationSeconds > 0n &&
		lockDurationSeconds > 0n &&
		cliffDurationSeconds > lockDurationSeconds;

	const formValid =
		validTokenAddress !== undefined &&
		!isTokenError &&
		!nonStandardDecimals &&
		validBeneficiary !== undefined &&
		parsedAmount > 0n &&
		lockDurationSeconds > 0n &&
		!cliffExceedsDuration;

	const handleCreateLock = useCallback(() => {
		if (!formValid || !validTokenAddress || !validBeneficiary) return;
		successFired.current = false;
		setTxDialogOpen(true);
		createLock(
			validTokenAddress,
			validBeneficiary,
			parsedAmount,
			lockDurationSeconds,
			cliffDurationSeconds,
			vestingEnabled,
			revocable,
		);
	}, [
		formValid,
		validTokenAddress,
		validBeneficiary,
		parsedAmount,
		lockDurationSeconds,
		cliffDurationSeconds,
		vestingEnabled,
		revocable,
		createLock,
	]);

	const handleSubmit = useCallback(
		(e: FormEvent) => {
			e.preventDefault();
			handleCreateLock();
		},
		[handleCreateLock],
	);

	const txState = deriveTxState(isCreating, isConfirming, isSuccess, error);

	useTransactionEffects({
		txHash,
		isConfirming,
		isSuccess,
		error,
		onSuccess: () => {
			if (txHash && lockId !== undefined) {
				successFired.current = true;
				setTxDialogOpen(false);
				const endTime = new Date(Date.now() + Number(lockDurationSeconds) * 1000);
				onSuccess?.({
					lockId,
					tokenSymbol: tokenSymbol ?? "tokens",
					amount,
					beneficiary,
					txHash,
					endTime,
				});
			}
		},
	});

	const handleRetry = useCallback(() => {
		reset();
		setTxDialogOpen(false);
		setTimeout(() => handleCreateLock(), 0);
	}, [reset, handleCreateLock]);

	const handleTxDialogClose = useCallback(
		(open: boolean) => {
			if (!open) {
				setTxDialogOpen(false);
				if (error) reset();
			}
		},
		[error, reset],
	);

	const handleUseMyAddress = useCallback(() => {
		if (address) setBeneficiary(address);
	}, [address]);

	const handleMaxAmount = useCallback(() => {
		if (tokenBalanceFormatted) setAmount(tokenBalanceFormatted);
	}, [tokenBalanceFormatted]);

	return (
		<>
			<div className="rounded-2xl border border-border-hair bg-bg-elevated p-6 shadow-[0_20px_60px_rgba(0,0,0,0.4)] sm:p-8">
				<form onSubmit={handleSubmit} className="space-y-6">
					<div className="space-y-2">
						<label htmlFor="lock-token" className={labelCls}>
							Token address
						</label>
						<input
							id="lock-token"
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
								This token uses {tokenDecimals} decimals instead of 6. Only TIP-20 tokens (6
								decimals) are supported.
							</p>
						)}
						{validTokenAddress && tokenName && tokenSymbol && !nonStandardDecimals && (
							<div className="flex items-center gap-2 text-[13px]">
								<span className="text-text-secondary">{tokenName}</span>
								<span className="rounded bg-bg-field px-1.5 py-0.5 font-mono text-[10px] text-gold uppercase tracking-[0.1em]">
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
						<label htmlFor="lock-beneficiary" className={labelCls}>
							Beneficiary
						</label>
						<div className="flex gap-2">
							<input
								id="lock-beneficiary"
								type="text"
								placeholder="0x… (who can claim the tokens)"
								value={beneficiary}
								onChange={(e) => setBeneficiary(e.target.value)}
								autoComplete="off"
								spellCheck={false}
								className={cn(inputCls, "flex-1 font-mono text-[14px]")}
							/>
							{isConnected && (
								<button
									type="button"
									onClick={handleUseMyAddress}
									className="shrink-0 rounded-xl border border-border-hair bg-bg-field px-3 py-3 text-[12px] text-text-secondary transition-colors hover:border-border-subtle hover:text-text-primary"
								>
									Use my address
								</button>
							)}
						</div>
					</div>

					<div className="space-y-2">
						<label htmlFor="lock-amount" className={labelCls}>
							Amount
						</label>
						<div className="flex gap-2">
							<input
								id="lock-amount"
								type="text"
								placeholder="0.00"
								value={amount}
								onChange={(e) => setAmount(e.target.value)}
								inputMode="decimal"
								autoComplete="off"
								className={cn(inputCls, "flex-1 font-mono")}
							/>
							{tokenBalance !== undefined && tokenBalance > 0n && (
								<button
									type="button"
									onClick={handleMaxAmount}
									className="shrink-0 rounded-xl border border-border-hair bg-bg-field px-3 py-3 text-[12px] text-text-secondary transition-colors hover:border-border-subtle hover:text-text-primary"
								>
									Max
								</button>
							)}
						</div>
					</div>

					<div className="space-y-2">
						<span className={labelCls}>Lock duration</span>
						<div className="flex flex-wrap gap-2">
							{DURATION_PRESETS.map((preset) => {
								const days = String(Number(preset.seconds / 86400n));
								const isActive = durationDays === days;
								return (
									<button
										key={preset.label}
										type="button"
										onClick={() => setDurationDays(days)}
										className={cn(
											presetBtnCls,
											isActive
												? "border-indigo/40 bg-indigo/10 text-indigo"
												: "border-border-hair bg-bg-field text-text-secondary hover:border-border-subtle hover:text-text-primary",
										)}
									>
										{preset.label}
									</button>
								);
							})}
						</div>
						<input
							type="text"
							placeholder="Custom days"
							value={durationDays}
							onChange={(e) => setDurationDays(e.target.value)}
							inputMode="numeric"
							autoComplete="off"
							className={cn(inputCls, "font-mono")}
						/>
					</div>

					<div className="space-y-2">
						<span className={labelCls}>Vesting</span>
						<div
							className="flex gap-1 rounded-xl border border-border-hair bg-bg-field p-1"
							role="tablist"
							aria-label="Vesting"
						>
							<button
								type="button"
								role="tab"
								aria-selected={!vestingEnabled}
								className={cn(
									"flex-1 rounded-lg px-3 py-2 text-[12.5px] font-medium transition-colors",
									!vestingEnabled
										? "bg-bg-elevated text-text-primary"
										: "text-text-tertiary hover:text-text-secondary",
								)}
								onClick={() => {
									setVestingEnabled(false);
									setCliffDays("");
								}}
							>
								No vesting
							</button>
							<button
								type="button"
								role="tab"
								aria-selected={vestingEnabled}
								className={cn(
									"flex-1 rounded-lg px-3 py-2 text-[12.5px] font-medium transition-colors",
									vestingEnabled
										? "bg-bg-elevated text-text-primary"
										: "text-text-tertiary hover:text-text-secondary",
								)}
								onClick={() => setVestingEnabled(true)}
							>
								Linear vesting
							</button>
						</div>
					</div>

					{vestingEnabled && (
						<div className="space-y-2">
							<span className={labelCls}>Cliff period</span>
							<div className="flex flex-wrap gap-2">
								{CLIFF_PRESETS.map((preset) => {
									const days = String(Number(preset.seconds / 86400n));
									const isActive = cliffDays === days;
									return (
										<button
											key={preset.label}
											type="button"
											onClick={() => setCliffDays(days)}
											className={cn(
												presetBtnCls,
												isActive
													? "border-indigo/40 bg-indigo/10 text-indigo"
													: "border-border-hair bg-bg-field text-text-secondary hover:border-border-subtle hover:text-text-primary",
											)}
										>
											{preset.label}
										</button>
									);
								})}
							</div>
							<input
								type="text"
								placeholder="Custom cliff days"
								value={cliffDays}
								onChange={(e) => setCliffDays(e.target.value)}
								inputMode="numeric"
								autoComplete="off"
								className={cn(inputCls, "font-mono")}
							/>
							{cliffExceedsDuration && (
								<p className="text-[12px] text-red">Cliff period cannot exceed lock duration.</p>
							)}
						</div>
					)}

					<div className="space-y-2">
						<span className={labelCls}>Revocable</span>
						<div
							className="flex gap-1 rounded-xl border border-border-hair bg-bg-field p-1"
							role="tablist"
							aria-label="Revocable"
						>
							<button
								type="button"
								role="tab"
								aria-selected={!revocable}
								className={cn(
									"flex-1 rounded-lg px-3 py-2 text-[12.5px] font-medium transition-colors",
									!revocable
										? "bg-bg-elevated text-text-primary"
										: "text-text-tertiary hover:text-text-secondary",
								)}
								onClick={() => setRevocable(false)}
							>
								No
							</button>
							<button
								type="button"
								role="tab"
								aria-selected={revocable}
								className={cn(
									"flex-1 rounded-lg px-3 py-2 text-[12.5px] font-medium transition-colors",
									revocable
										? "bg-bg-elevated text-text-primary"
										: "text-text-tertiary hover:text-text-secondary",
								)}
								onClick={() => setRevocable(true)}
							>
								Yes
							</button>
						</div>
						{revocable && (
							<p className="text-[12px] text-text-tertiary">
								You can revoke this lock and reclaim unvested tokens at any time.
							</p>
						)}
					</div>

					{parsedAmount > 0n && lockDurationSeconds > 0n && (
						<VestingPreview
							amount={amount}
							lockDurationDays={Number(durationDays)}
							cliffDurationDays={vestingEnabled && cliffDays ? Number(cliffDays) : 0}
							vestingEnabled={vestingEnabled}
							tokenSymbol={tokenSymbol}
						/>
					)}

					<div className="space-y-2 border-border-hair border-t pt-5">
						<div className="flex items-center justify-between text-[13px]">
							<span className={labelCls}>Lock fee</span>
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
								Insufficient USDC balance to cover the lock fee.
							</p>
						)}
						{insufficientToken && (
							<p className="text-[12px] text-red">
								Insufficient {tokenSymbol ?? "token"} balance to cover the lock amount.
							</p>
						)}
					</div>

					<LockButton
						needsUsdcApproval={needsUsdcApproval}
						needsTokenApproval={needsTokenApproval}
						isAllowanceLoading={isUsdcAllowanceLoading || isTokenAllowanceLoading}
						insufficientUsdc={insufficientUsdc}
						insufficientToken={insufficientToken}
						isUsdcApproving={isUsdcApproving}
						isUsdcApprovalConfirming={isUsdcApprovalConfirming}
						isTokenApproving={isTokenApproving}
						isTokenApprovalConfirming={isTokenApprovalConfirming}
						isCreating={isCreating}
						isConfirming={isConfirming}
						disabled={!formValid}
						tokenSymbol={tokenSymbol}
						onApproveUsdc={approveUsdc}
						onApproveToken={approveToken}
						onCreateLock={handleCreateLock}
					/>
				</form>
			</div>

			<TransactionStatus
				open={txDialogOpen && txState !== "idle"}
				onOpenChange={handleTxDialogClose}
				state={txState}
				txHash={txHash}
				title="Forging lock"
				onRetry={error ? handleRetry : undefined}
				error={error ? formatErrorMessage(error, 120) : undefined}
			/>
		</>
	);
}
