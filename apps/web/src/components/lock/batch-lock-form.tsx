"use client";

import { PlusIcon, TrashIcon } from "lucide-react";
import { type FormEvent, useCallback, useMemo, useRef, useState } from "react";
import { formatUnits, type Hex, isAddress, parseUnits } from "viem";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { TransactionStatus } from "@/components/ui/transaction-status";
import { useCreateBatchLock } from "@/hooks/use-create-batch-lock";
import { useLockFee } from "@/hooks/use-lock-fee";
import { useTokenApproval } from "@/hooks/use-token-approval";
import { useTokenBalance } from "@/hooks/use-token-balance";
import { useTokenInfo } from "@/hooks/use-token-info";
import { useTransactionEffects } from "@/hooks/use-transaction-effects";
import { useUsdcApproval } from "@/hooks/use-usdc-approval";
import { useUsdcBalance } from "@/hooks/use-usdc-balance";
import { FEES, TIP20_DECIMALS } from "@/lib/constants";
import { lockerV2Config } from "@/lib/contracts";
import { detectDelimiter, downloadCsvTemplate, stripBom } from "@/lib/csv-utils";
import { deriveTxState, formatErrorMessage } from "@/lib/format";
import { CLIFF_PRESETS, DURATION_PRESETS } from "@/lib/lock-utils";
import { LockButton } from "./lock-button";
import { VestingPreview } from "./vesting-preview";

const MAX_BATCH = 50;
const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;
const VALID_AMOUNT = /^\d+(\.\d{1,6})?$/;
const VALID_DAYS = /^\d+$/;

type InputMode = "paste" | "manual";

interface BeneficiaryRow {
	address: string;
	amount: string;
}

interface BatchLockFormProps {
	onSuccess?: (data: {
		lockIds: bigint[];
		tokenSymbol: string;
		totalAmount: string;
		count: number;
		txHash: string;
		durationDays: number;
	}) => void;
	initialToken?: string;
}

function parsePasteText(text: string) {
	const cleaned = stripBom(text).trim();
	if (!cleaned) return { rows: [] as BeneficiaryRow[], errors: [] as string[], totalAmount: 0n };

	const delimiter = detectDelimiter(cleaned);
	const delimiterRe = delimiter === "\t" ? /\t+/ : new RegExp(`[${delimiter}]+`);

	const lines = cleaned.split("\n").filter((l) => l.trim().length > 0);
	const rows: BeneficiaryRow[] = [];
	const errors: string[] = [];
	let totalAmount = 0n;
	const headerRe = /^(address|recipient|wallet|to)[,;\t]/i;

	const startIdx = lines.length > 0 && headerRe.test(lines[0] as string) ? 1 : 0;

	if (lines.length - startIdx > MAX_BATCH) {
		errors.push(`Maximum ${MAX_BATCH} beneficiaries allowed (got ${lines.length - startIdx})`);
		return { rows: [], errors, totalAmount: 0n };
	}

	for (let i = startIdx; i < lines.length; i++) {
		const parts = (lines[i] as string).split(delimiterRe).map((p) => p.trim());
		const addr = parts[0] ?? "";
		const amt = parts[1] ?? "";
		const lineNum = i + 1;

		if (!ADDRESS_RE.test(addr)) {
			errors.push(`Line ${lineNum}: Invalid address "${addr.slice(0, 10)}..."`);
			continue;
		}
		if (!VALID_AMOUNT.test(amt) || Number(amt) <= 0) {
			errors.push(`Line ${lineNum}: Invalid amount "${amt}"`);
			continue;
		}
		totalAmount += parseUnits(amt, TIP20_DECIMALS);
		rows.push({ address: addr, amount: amt });
	}

	return { rows, errors, totalAmount };
}

function parseManualRows(
	manualRows: BeneficiaryRow[],
	equalSplit: boolean,
	equalTotalAmount: string,
) {
	const rows: BeneficiaryRow[] = [];
	const errors: string[] = [];
	let totalAmount = 0n;

	const nonEmpty = manualRows.filter((r) => r.address.trim());
	if (nonEmpty.length === 0) return { rows: [], errors: [], totalAmount: 0n };

	if (nonEmpty.length > MAX_BATCH) {
		errors.push(`Maximum ${MAX_BATCH} beneficiaries allowed (got ${nonEmpty.length})`);
		return { rows: [], errors, totalAmount: 0n };
	}

	// Validate addresses first
	for (let i = 0; i < nonEmpty.length; i++) {
		const r = nonEmpty[i] as BeneficiaryRow;
		if (!ADDRESS_RE.test(r.address.trim())) {
			errors.push(`Row ${i + 1}: Invalid address`);
		}
	}
	if (errors.length > 0) return { rows: [], errors, totalAmount: 0n };

	if (equalSplit) {
		if (!VALID_AMOUNT.test(equalTotalAmount) || Number(equalTotalAmount) <= 0) {
			errors.push("Enter a valid total amount to split");
			return { rows: [], errors, totalAmount: 0n };
		}
		const total = parseUnits(equalTotalAmount, TIP20_DECIMALS);
		const perPerson = total / BigInt(nonEmpty.length);
		if (perPerson === 0n) {
			errors.push("Amount per beneficiary is too small");
			return { rows: [], errors, totalAmount: 0n };
		}
		// Last person gets remainder
		const remainder = total - perPerson * BigInt(nonEmpty.length);
		for (let i = 0; i < nonEmpty.length; i++) {
			const r = nonEmpty[i] as BeneficiaryRow;
			const amt = i === nonEmpty.length - 1 ? perPerson + remainder : perPerson;
			rows.push({ address: r.address.trim(), amount: formatUnits(amt, TIP20_DECIMALS) });
			totalAmount += amt;
		}
	} else {
		for (let i = 0; i < nonEmpty.length; i++) {
			const r = nonEmpty[i] as BeneficiaryRow;
			const amt = r.amount.trim();
			if (!VALID_AMOUNT.test(amt) || Number(amt) <= 0) {
				errors.push(`Row ${i + 1}: Invalid amount`);
				continue;
			}
			const parsed = parseUnits(amt, TIP20_DECIMALS);
			totalAmount += parsed;
			rows.push({ address: r.address.trim(), amount: amt });
		}
	}

	return { rows, errors, totalAmount };
}

export function BatchLockForm({ onSuccess, initialToken }: BatchLockFormProps) {
	const { isConnected } = useAccount();

	const [tokenAddress, setTokenAddress] = useState(initialToken ?? "");
	const [durationDays, setDurationDays] = useState("");
	const [vestingEnabled, setVestingEnabled] = useState(false);
	const [cliffDays, setCliffDays] = useState("");
	const [revocable, setRevocable] = useState(false);
	const [inputMode, setInputMode] = useState<InputMode>("paste");
	const [pasteText, setPasteText] = useState("");
	const [manualRows, setManualRows] = useState<BeneficiaryRow[]>([{ address: "", amount: "" }]);
	const [equalSplit, setEqualSplit] = useState(false);
	const [equalTotalAmount, setEqualTotalAmount] = useState("");
	const [txDialogOpen, setTxDialogOpen] = useState(false);
	const successFired = useRef(false);

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

	const { fee } = useLockFee();
	const { balance: usdcBalance, formatted: usdcBalanceFormatted } = useUsdcBalance();

	const nonStandardDecimals = tokenDecimals !== undefined && tokenDecimals !== TIP20_DECIMALS;

	const parsed = useMemo(
		() =>
			inputMode === "paste"
				? parsePasteText(pasteText)
				: parseManualRows(manualRows, equalSplit, equalTotalAmount),
		[inputMode, pasteText, manualRows, equalSplit, equalTotalAmount],
	);

	const lockDurationSeconds = useMemo(() => {
		if (!durationDays || !VALID_DAYS.test(durationDays) || Number(durationDays) <= 0) return 0n;
		return BigInt(durationDays) * 86400n;
	}, [durationDays]);

	const cliffDurationSeconds = useMemo(() => {
		if (!vestingEnabled || !cliffDays || !VALID_DAYS.test(cliffDays)) return 0n;
		return BigInt(cliffDays) * 86400n;
	}, [vestingEnabled, cliffDays]);

	const feeAmount = fee ?? parseUnits(String(FEES.batchLock), TIP20_DECIMALS);

	const {
		needsApproval: needsUsdcApproval,
		isAllowanceLoading: isUsdcAllowanceLoading,
		approve: approveUsdc,
		isApproving: isUsdcApproving,
		isApprovalConfirming: isUsdcApprovalConfirming,
	} = useUsdcApproval({
		spender: lockerV2Config.address,
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
		spender: lockerV2Config.address,
		amount: parsed.totalAmount,
	});

	const { createBatchLock, isCreating, isConfirming, isSuccess, txHash, lockIds, error, reset } =
		useCreateBatchLock();

	const insufficientUsdc = usdcBalance !== undefined && usdcBalance < feeAmount;
	const insufficientToken =
		tokenBalance !== undefined && parsed.totalAmount > 0n && tokenBalance < parsed.totalAmount;
	const cliffExceedsDuration =
		cliffDurationSeconds > 0n &&
		lockDurationSeconds > 0n &&
		cliffDurationSeconds > lockDurationSeconds;

	const formValid =
		validTokenAddress !== undefined &&
		!isTokenError &&
		!nonStandardDecimals &&
		parsed.rows.length > 0 &&
		parsed.errors.length === 0 &&
		parsed.totalAmount > 0n &&
		lockDurationSeconds > 0n &&
		!cliffExceedsDuration;

	const handleCreateBatchLock = useCallback(() => {
		if (!formValid || !validTokenAddress) return;
		successFired.current = false;
		setTxDialogOpen(true);

		const beneficiaries = parsed.rows.map((r) => r.address as Hex);
		const amounts = parsed.rows.map((r) => parseUnits(r.amount, TIP20_DECIMALS));

		createBatchLock(
			validTokenAddress,
			beneficiaries,
			amounts,
			lockDurationSeconds,
			cliffDurationSeconds,
			vestingEnabled,
			revocable,
		);
	}, [
		formValid,
		validTokenAddress,
		parsed.rows,
		lockDurationSeconds,
		cliffDurationSeconds,
		vestingEnabled,
		revocable,
		createBatchLock,
	]);

	const handleSubmit = useCallback(
		(e: FormEvent) => {
			e.preventDefault();
			handleCreateBatchLock();
		},
		[handleCreateBatchLock],
	);

	const txState = deriveTxState(isCreating, isConfirming, isSuccess, error);

	useTransactionEffects({
		txHash,
		isConfirming,
		isSuccess,
		error,
		onSuccess: () => {
			if (txHash && lockIds.length > 0 && !successFired.current) {
				successFired.current = true;
				setTxDialogOpen(false);
				onSuccess?.({
					lockIds,
					tokenSymbol: tokenSymbol ?? "tokens",
					totalAmount: formatUnits(parsed.totalAmount, TIP20_DECIMALS),
					count: parsed.rows.length,
					txHash,
					durationDays: Number(durationDays),
				});
			}
		},
	});

	const handleRetry = useCallback(() => {
		reset();
		setTxDialogOpen(false);
		setTimeout(() => handleCreateBatchLock(), 0);
	}, [reset, handleCreateBatchLock]);

	const handleTxDialogClose = useCallback(
		(open: boolean) => {
			if (!open) {
				setTxDialogOpen(false);
				if (error) reset();
			}
		},
		[error, reset],
	);

	const handleDownloadTemplate = useCallback(() => {
		downloadCsvTemplate(
			"batch-lock-template.csv",
			["address", "amount"],
			[
				["0x1234567890abcdef1234567890abcdef12345678", "1000"],
				["0xabcdefabcdefabcdefabcdefabcdefabcdefabcd", "2500"],
			],
		);
	}, []);

	const handleAddRow = useCallback(() => {
		if (manualRows.length >= MAX_BATCH) return;
		setManualRows((prev) => [...prev, { address: "", amount: "" }]);
	}, [manualRows.length]);

	const handleRemoveRow = useCallback(
		(index: number) => {
			if (manualRows.length <= 1) return;
			setManualRows((prev) => prev.filter((_, i) => i !== index));
		},
		[manualRows.length],
	);

	const handleRowChange = useCallback((index: number, field: "address" | "amount", val: string) => {
		setManualRows((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: val } : row)));
	}, []);

	return (
		<>
			<Card className="border-anvil-gray-light bg-deep-charcoal">
				<CardContent>
					<form onSubmit={handleSubmit} className="space-y-5">
						{/* Token Address */}
						<div className="space-y-2">
							<label htmlFor="batch-token" className="text-sm font-medium text-smoke">
								Token Address
							</label>
							<Input
								id="batch-token"
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

						{/* Input mode toggle */}
						<div className="space-y-2">
							<span className="text-sm font-medium text-smoke">
								Beneficiaries (max {MAX_BATCH})
							</span>
							<div
								className="flex gap-1 rounded-md border border-anvil-gray-light bg-obsidian-black p-1"
								role="tablist"
								aria-label="Input mode"
							>
								<button
									type="button"
									role="tab"
									aria-selected={inputMode === "paste"}
									className={`flex-1 rounded px-3 py-1.5 text-xs font-medium transition-colors ${
										inputMode === "paste"
											? "bg-anvil-gray text-smoke"
											: "text-smoke-dark hover:text-smoke"
									}`}
									onClick={() => setInputMode("paste")}
								>
									Paste / CSV
								</button>
								<button
									type="button"
									role="tab"
									aria-selected={inputMode === "manual"}
									className={`flex-1 rounded px-3 py-1.5 text-xs font-medium transition-colors ${
										inputMode === "manual"
											? "bg-anvil-gray text-smoke"
											: "text-smoke-dark hover:text-smoke"
									}`}
									onClick={() => setInputMode("manual")}
								>
									Manual Entry
								</button>
							</div>
						</div>

						{inputMode === "paste" ? (
							<div className="space-y-2">
								<div className="flex justify-end">
									<button
										type="button"
										onClick={handleDownloadTemplate}
										className="text-xs text-smoke-dark transition-colors hover:text-smoke"
									>
										Download template
									</button>
								</div>
								<textarea
									id="batch-beneficiaries"
									className="min-h-[120px] w-full rounded-md border border-anvil-gray-light bg-obsidian-black px-3 py-2 font-mono text-sm text-smoke placeholder:text-smoke-dark focus:border-forge-green focus:outline-none focus:ring-1 focus:ring-forge-green"
									placeholder={"0x1234...abcd,1000\n0x5678...efgh,2500\n0xabcd...1234,500"}
									value={pasteText}
									onChange={(e) => setPasteText(e.target.value)}
									spellCheck={false}
								/>
								<p className="text-xs text-smoke-dark">
									One per line: address,amount (comma, semicolon, or tab separated)
								</p>
							</div>
						) : (
							<div className="space-y-3">
								{/* Equal split toggle */}
								<div className="flex items-center gap-3">
									<label className="flex cursor-pointer items-center gap-2 text-xs text-smoke-dark">
										<input
											type="checkbox"
											checked={equalSplit}
											onChange={(e) => setEqualSplit(e.target.checked)}
											className="size-3.5 rounded border-anvil-gray-light accent-molten-amber"
										/>
										Equal split
									</label>
									{equalSplit && (
										<Input
											placeholder="Total amount to split"
											value={equalTotalAmount}
											onChange={(e) => setEqualTotalAmount(e.target.value)}
											inputMode="decimal"
											autoComplete="off"
											className="h-8 max-w-[200px] font-mono text-xs"
										/>
									)}
								</div>

								{/* Manual rows */}
								<div className="space-y-2">
									{manualRows.map((row, i) => (
										<div key={`row-${i.toString()}`} className="flex items-center gap-2">
											<Input
												aria-label={`Beneficiary ${i + 1} address`}
												placeholder="0x..."
												value={row.address}
												onChange={(e) => handleRowChange(i, "address", e.target.value)}
												className="flex-[2] font-mono text-sm"
												autoComplete="off"
												spellCheck={false}
											/>
											{!equalSplit && (
												<Input
													aria-label={`Beneficiary ${i + 1} amount`}
													placeholder="Amount"
													value={row.amount}
													onChange={(e) => handleRowChange(i, "amount", e.target.value)}
													className="flex-1 font-mono text-sm"
													inputMode="decimal"
													autoComplete="off"
												/>
											)}
											<Button
												type="button"
												variant="ghost"
												size="sm"
												className="h-9 w-9 shrink-0 p-0"
												onClick={() => handleRemoveRow(i)}
												disabled={manualRows.length <= 1}
												aria-label={`Remove beneficiary ${i + 1}`}
											>
												<TrashIcon className="size-3.5 text-smoke-dark" />
											</Button>
										</div>
									))}
									<Button
										type="button"
										variant="ghost"
										size="sm"
										className="h-8 text-xs text-smoke-dark"
										onClick={handleAddRow}
										disabled={manualRows.length >= MAX_BATCH}
									>
										<PlusIcon className="size-3" />
										Add Beneficiary
									</Button>
								</div>
							</div>
						)}

						{/* Parse errors */}
						{parsed.errors.length > 0 && (
							<div className="space-y-1" role="alert">
								{parsed.errors.map((err) => (
									<p key={err} className="text-xs text-ember-red">
										{err}
									</p>
								))}
							</div>
						)}

						{/* Preview */}
						{parsed.rows.length > 0 && parsed.errors.length === 0 && (
							<div className="rounded-lg border border-anvil-gray-light bg-obsidian-black/50 p-3">
								<div className="mb-2 flex items-center justify-between text-xs text-smoke-dark">
									<span>{parsed.rows.length} beneficiaries</span>
									<span className="font-mono text-smoke">
										Total: {formatUnits(parsed.totalAmount, TIP20_DECIMALS)}{" "}
										{tokenSymbol ?? "tokens"}
									</span>
								</div>
								<div className="max-h-[160px] overflow-y-auto">
									<table className="w-full text-xs" aria-label="Beneficiaries preview">
										<thead>
											<tr className="border-b border-anvil-gray-light text-smoke-dark">
												<th className="pb-1 text-left font-medium">#</th>
												<th className="pb-1 text-left font-medium">Address</th>
												<th className="pb-1 text-right font-medium">Amount</th>
											</tr>
										</thead>
										<tbody>
											{parsed.rows.map((r, i) => (
												<tr
													key={`${r.address}-${r.amount}`}
													className="border-b border-anvil-gray-light/50"
												>
													<td className="py-1 text-smoke-dark">{i + 1}</td>
													<td className="py-1 font-mono text-smoke">
														{r.address.slice(0, 8)}...{r.address.slice(-6)}
													</td>
													<td className="py-1 text-right font-mono text-smoke">{r.amount}</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							</div>
						)}

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

						{/* Cliff Period */}
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
						</div>

						{/* Vesting Preview */}
						{parsed.totalAmount > 0n && lockDurationSeconds > 0n && (
							<VestingPreview
								amount={formatUnits(parsed.totalAmount, TIP20_DECIMALS)}
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
								<span className="text-smoke-dark">Batch fee (flat)</span>
								<span className="font-mono text-smoke">~{FEES.batchLock} USDC</span>
							</div>
							<p className="text-xs text-smoke-dark">
								One flat fee for the entire batch, regardless of beneficiary count.
							</p>
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
									Insufficient USDC balance to cover the batch fee
								</p>
							)}
							{insufficientToken && (
								<p className="text-xs text-ember-red">
									Insufficient {tokenSymbol ?? "token"} balance to cover total lock amount
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
							onCreateLock={handleCreateBatchLock}
						/>
					</form>
				</CardContent>
			</Card>

			<TransactionStatus
				open={txDialogOpen && txState !== "idle"}
				onOpenChange={handleTxDialogClose}
				state={txState}
				txHash={txHash}
				title="Creating Batch Lock"
				onRetry={error ? handleRetry : undefined}
				error={error ? formatErrorMessage(error, 120) : undefined}
			/>
		</>
	);
}
