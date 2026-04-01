"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type Hex, isAddress, parseUnits } from "viem";
import { useAccount } from "wagmi";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
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
import { lockerConfig } from "@/lib/contracts";
import { deriveTxState, formatErrorMessage } from "@/lib/format";
import { CLIFF_PRESETS, DURATION_PRESETS } from "@/lib/lock-utils";
import { LockButton } from "./lock-button";
import { VestingPreview } from "./vesting-preview";

const VALID_AMOUNT = /^\d+(\.\d{1,6})?$/;
const VALID_DAYS = /^\d+$/;

interface LockFormProps {
	onSuccess?: (data: {
		lockId: bigint;
		tokenSymbol: string;
		amount: string;
		beneficiary: string;
		txHash: string;
		endTime: Date;
	}) => void;
}

export function LockForm({ onSuccess }: LockFormProps) {
	const { address, isConnected } = useAccount();

	const [tokenAddress, setTokenAddress] = useState("");
	const [beneficiary, setBeneficiary] = useState(address ?? "");
	const [amount, setAmount] = useState("");
	const [durationDays, setDurationDays] = useState("");
	const [vestingEnabled, setVestingEnabled] = useState(false);
	const [cliffDays, setCliffDays] = useState("");
	const [revocable, setRevocable] = useState(false);
	const [txDialogOpen, setTxDialogOpen] = useState(false);
	const successFired = useRef(false);

	// Default beneficiary to connected wallet when wallet connects
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
		spender: lockerConfig.address,
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
		spender: lockerConfig.address,
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
			<Card className="border-anvil-gray-light bg-deep-charcoal">
				<CardContent>
					<form onSubmit={handleSubmit} className="space-y-5">
						{/* Token Address */}
						<div className="space-y-2">
							<label htmlFor="lock-token" className="text-sm font-medium text-smoke">
								Token Address
							</label>
							<Input
								id="lock-token"
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

						{/* Beneficiary */}
						<div className="space-y-2">
							<label htmlFor="lock-beneficiary" className="text-sm font-medium text-smoke">
								Beneficiary
							</label>
							<div className="flex gap-2">
								<Input
									id="lock-beneficiary"
									placeholder="0x... (who can claim the tokens)"
									value={beneficiary}
									onChange={(e) => setBeneficiary(e.target.value)}
									autoComplete="off"
									spellCheck={false}
									className="flex-1 font-mono"
								/>
								{isConnected && (
									<button
										type="button"
										onClick={handleUseMyAddress}
										className="shrink-0 rounded-md border border-anvil-gray-light bg-obsidian-black px-3 py-2 text-xs text-smoke-dark transition-colors hover:text-smoke"
									>
										Use my address
									</button>
								)}
							</div>
						</div>

						{/* Amount */}
						<div className="space-y-2">
							<label htmlFor="lock-amount" className="text-sm font-medium text-smoke">
								Amount
							</label>
							<div className="flex gap-2">
								<Input
									id="lock-amount"
									placeholder="0.00"
									value={amount}
									onChange={(e) => setAmount(e.target.value)}
									inputMode="decimal"
									autoComplete="off"
									className="flex-1 font-mono"
								/>
								{tokenBalance !== undefined && tokenBalance > 0n && (
									<button
										type="button"
										onClick={handleMaxAmount}
										className="shrink-0 rounded-md border border-anvil-gray-light bg-obsidian-black px-3 py-2 text-xs text-smoke-dark transition-colors hover:text-smoke"
									>
										Max
									</button>
								)}
							</div>
						</div>

						{/* Lock Duration */}
						<div className="space-y-2">
							<span className="text-sm font-medium text-smoke">Lock Duration</span>
							<div className="flex flex-wrap gap-2">
								{DURATION_PRESETS.map((preset) => {
									const days = String(Number(preset.seconds / 86400n));
									const isActive = durationDays === days;
									return (
										<button
											key={preset.label}
											type="button"
											onClick={() => setDurationDays(days)}
											className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
												isActive
													? "border-molten-amber bg-molten-amber/10 text-molten-amber"
													: "border-anvil-gray-light text-smoke-dark hover:text-smoke"
											}`}
										>
											{preset.label}
										</button>
									);
								})}
							</div>
							<Input
								placeholder="Custom days"
								value={durationDays}
								onChange={(e) => setDurationDays(e.target.value)}
								inputMode="numeric"
								autoComplete="off"
								className="font-mono"
							/>
						</div>

						{/* Vesting Toggle */}
						<div className="space-y-3">
							<span className="text-sm font-medium text-smoke">Vesting</span>
							<div
								className="flex gap-1 rounded-md border border-anvil-gray-light bg-obsidian-black p-1"
								role="tablist"
								aria-label="Vesting"
							>
								<button
									type="button"
									role="tab"
									aria-selected={!vestingEnabled}
									className={`flex-1 rounded px-3 py-1.5 text-xs font-medium transition-colors ${
										!vestingEnabled
											? "bg-anvil-gray text-smoke"
											: "text-smoke-dark hover:text-smoke"
									}`}
									onClick={() => {
										setVestingEnabled(false);
										setCliffDays("");
									}}
								>
									No Vesting
								</button>
								<button
									type="button"
									role="tab"
									aria-selected={vestingEnabled}
									className={`flex-1 rounded px-3 py-1.5 text-xs font-medium transition-colors ${
										vestingEnabled ? "bg-anvil-gray text-smoke" : "text-smoke-dark hover:text-smoke"
									}`}
									onClick={() => setVestingEnabled(true)}
								>
									Linear Vesting
								</button>
							</div>
						</div>

						{/* Cliff Period (only when vesting enabled) */}
						{vestingEnabled && (
							<div className="space-y-2">
								<span className="text-sm font-medium text-smoke">Cliff Period</span>
								<div className="flex flex-wrap gap-2">
									{CLIFF_PRESETS.map((preset) => {
										const days = String(Number(preset.seconds / 86400n));
										const isActive = cliffDays === days;
										return (
											<button
												key={preset.label}
												type="button"
												onClick={() => setCliffDays(days)}
												className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
													isActive
														? "border-molten-amber bg-molten-amber/10 text-molten-amber"
														: "border-anvil-gray-light text-smoke-dark hover:text-smoke"
												}`}
											>
												{preset.label}
											</button>
										);
									})}
								</div>
								<Input
									placeholder="Custom cliff days"
									value={cliffDays}
									onChange={(e) => setCliffDays(e.target.value)}
									inputMode="numeric"
									autoComplete="off"
									className="font-mono"
								/>
								{cliffExceedsDuration && (
									<p className="text-xs text-ember-red">Cliff period cannot exceed lock duration</p>
								)}
							</div>
						)}

						{/* Revocable Toggle */}
						<div className="space-y-3">
							<span className="text-sm font-medium text-smoke">Revocable</span>
							<div
								className="flex gap-1 rounded-md border border-anvil-gray-light bg-obsidian-black p-1"
								role="tablist"
								aria-label="Revocable"
							>
								<button
									type="button"
									role="tab"
									aria-selected={!revocable}
									className={`flex-1 rounded px-3 py-1.5 text-xs font-medium transition-colors ${
										!revocable ? "bg-anvil-gray text-smoke" : "text-smoke-dark hover:text-smoke"
									}`}
									onClick={() => setRevocable(false)}
								>
									No
								</button>
								<button
									type="button"
									role="tab"
									aria-selected={revocable}
									className={`flex-1 rounded px-3 py-1.5 text-xs font-medium transition-colors ${
										revocable ? "bg-anvil-gray text-smoke" : "text-smoke-dark hover:text-smoke"
									}`}
									onClick={() => setRevocable(true)}
								>
									Yes
								</button>
							</div>
							{revocable && (
								<p className="text-xs text-smoke-dark">
									You can revoke this lock and reclaim unvested tokens at any time.
								</p>
							)}
						</div>

						{/* Vesting Preview */}
						{parsedAmount > 0n && lockDurationSeconds > 0n && (
							<VestingPreview
								amount={amount}
								lockDurationDays={Number(durationDays)}
								cliffDurationDays={vestingEnabled && cliffDays ? Number(cliffDays) : 0}
								vestingEnabled={vestingEnabled}
								tokenSymbol={tokenSymbol}
							/>
						)}

						<Separator className="bg-anvil-gray-light" />

						{/* Fee section */}
						<div className="space-y-2">
							<div className="flex items-center justify-between text-sm">
								<span className="text-smoke-dark">Lock fee</span>
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
									Insufficient USDC balance to cover the lock fee
								</p>
							)}
							{insufficientToken && (
								<p className="text-xs text-ember-red">
									Insufficient {tokenSymbol ?? "token"} balance to cover the lock amount
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
				</CardContent>
			</Card>

			<TransactionStatus
				open={txDialogOpen && txState !== "idle"}
				onOpenChange={handleTxDialogClose}
				state={txState}
				txHash={txHash}
				title="Creating Lock"
				onRetry={error ? handleRetry : undefined}
				error={error ? formatErrorMessage(error, 120) : undefined}
			/>
		</>
	);
}
