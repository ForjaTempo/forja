"use client";

import { PlusIcon, TrashIcon } from "lucide-react";
import { type FormEvent, useCallback, useMemo, useRef, useState } from "react";
import { formatUnits, type Hex, isAddress, parseUnits } from "viem";
import { useAccount } from "wagmi";
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
import { cn } from "@/lib/utils";
import { LockButton } from "./lock-button";
import { VestingPreview } from "./vesting-preview";

const MAX_BATCH = 50;
const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;
const VALID_AMOUNT = /^\d+(\.\d{1,6})?$/;
const VALID_DAYS = /^\d+$/;

const labelCls = "font-mono text-[11px] uppercase tracking-[0.12em] text-text-tertiary";
const inputCls =
	"w-full rounded-xl border border-border-hair bg-bg-field px-4 py-3 text-[15px] text-text-primary placeholder:text-text-tertiary focus:border-gold/60 focus:outline-none transition-colors";
const presetBtnCls = "rounded-lg border px-3 py-1.5 font-medium text-[12px] transition-colors";

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
			<div className="rounded-2xl border border-border-hair bg-bg-elevated p-6 shadow-[0_20px_60px_rgba(0,0,0,0.4)] sm:p-8">
				<form onSubmit={handleSubmit} className="space-y-6">
					<div className="space-y-2">
						<label htmlFor="batch-token" className={labelCls}>
							Token address
						</label>
						<input
							id="batch-token"
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
						<span className={labelCls}>Beneficiaries · max {MAX_BATCH}</span>
						<div
							className="flex gap-1 rounded-xl border border-border-hair bg-bg-field p-1"
							role="tablist"
							aria-label="Input mode"
						>
							<button
								type="button"
								role="tab"
								aria-selected={inputMode === "paste"}
								className={cn(
									"flex-1 rounded-lg px-3 py-1.5 text-[12.5px] font-medium transition-colors",
									inputMode === "paste"
										? "bg-bg-elevated text-text-primary"
										: "text-text-tertiary hover:text-text-secondary",
								)}
								onClick={() => setInputMode("paste")}
							>
								Paste / CSV
							</button>
							<button
								type="button"
								role="tab"
								aria-selected={inputMode === "manual"}
								className={cn(
									"flex-1 rounded-lg px-3 py-1.5 text-[12.5px] font-medium transition-colors",
									inputMode === "manual"
										? "bg-bg-elevated text-text-primary"
										: "text-text-tertiary hover:text-text-secondary",
								)}
								onClick={() => setInputMode("manual")}
							>
								Manual entry
							</button>
						</div>
					</div>

					{inputMode === "paste" ? (
						<div className="space-y-2">
							<div className="flex justify-end">
								<button
									type="button"
									onClick={handleDownloadTemplate}
									className="text-[12px] text-text-tertiary transition-colors hover:text-text-secondary"
								>
									Download template
								</button>
							</div>
							<textarea
								id="batch-beneficiaries"
								className="min-h-[140px] w-full rounded-xl border border-border-hair bg-bg-field px-4 py-3 font-mono text-[13px] text-text-primary placeholder:text-text-tertiary focus:border-gold/60 focus:outline-none transition-colors"
								placeholder={"0x1234…abcd,1000\n0x5678…efgh,2500\n0xabcd…1234,500"}
								value={pasteText}
								onChange={(e) => setPasteText(e.target.value)}
								spellCheck={false}
							/>
							<p className="text-[12px] text-text-tertiary">
								One per line: address,amount (comma, semicolon, or tab separated).
							</p>
						</div>
					) : (
						<div className="space-y-3">
							<div className="flex items-center gap-3">
								<label className="flex cursor-pointer items-center gap-2 text-[12px] text-text-secondary">
									<input
										type="checkbox"
										checked={equalSplit}
										onChange={(e) => setEqualSplit(e.target.checked)}
										className="size-3.5 accent-indigo"
									/>
									Equal split
								</label>
								{equalSplit && (
									<input
										type="text"
										placeholder="Total amount to split"
										value={equalTotalAmount}
										onChange={(e) => setEqualTotalAmount(e.target.value)}
										inputMode="decimal"
										autoComplete="off"
										className={cn(inputCls, "h-9 max-w-[220px] py-2 font-mono text-[12px]")}
									/>
								)}
							</div>

							<div className="space-y-2">
								{manualRows.map((row, i) => (
									<div key={`row-${i.toString()}`} className="flex items-center gap-2">
										<input
											type="text"
											aria-label={`Beneficiary ${i + 1} address`}
											placeholder="0x…"
											value={row.address}
											onChange={(e) => handleRowChange(i, "address", e.target.value)}
											className={cn(inputCls, "flex-[2] py-2.5 font-mono text-[13px]")}
											autoComplete="off"
											spellCheck={false}
										/>
										{!equalSplit && (
											<input
												type="text"
												aria-label={`Beneficiary ${i + 1} amount`}
												placeholder="Amount"
												value={row.amount}
												onChange={(e) => handleRowChange(i, "amount", e.target.value)}
												className={cn(inputCls, "flex-1 py-2.5 font-mono text-[13px]")}
												inputMode="decimal"
												autoComplete="off"
											/>
										)}
										<button
											type="button"
											className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-border-hair bg-bg-field text-text-tertiary transition-colors hover:border-border-subtle hover:text-red disabled:cursor-not-allowed disabled:opacity-40"
											onClick={() => handleRemoveRow(i)}
											disabled={manualRows.length <= 1}
											aria-label={`Remove beneficiary ${i + 1}`}
										>
											<TrashIcon className="size-3.5" />
										</button>
									</div>
								))}
								<button
									type="button"
									className="inline-flex items-center gap-1.5 rounded-lg border border-border-hair bg-bg-field px-3 py-2 text-[12px] font-medium text-text-secondary transition-colors hover:border-border-subtle hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40"
									onClick={handleAddRow}
									disabled={manualRows.length >= MAX_BATCH}
								>
									<PlusIcon className="size-3" />
									Add beneficiary
								</button>
							</div>
						</div>
					)}

					{parsed.errors.length > 0 && (
						<div className="space-y-1" role="alert">
							{parsed.errors.map((err) => (
								<p key={err} className="text-[12px] text-red">
									{err}
								</p>
							))}
						</div>
					)}

					{parsed.rows.length > 0 && parsed.errors.length === 0 && (
						<div className="rounded-xl border border-border-hair bg-bg-field/60 p-3.5">
							<div className="mb-2.5 flex items-center justify-between text-[12px]">
								<span className="text-text-tertiary">{parsed.rows.length} beneficiaries</span>
								<span className="font-mono text-text-primary">
									Total {formatUnits(parsed.totalAmount, TIP20_DECIMALS)} {tokenSymbol ?? "tokens"}
								</span>
							</div>
							<div className="max-h-[180px] overflow-y-auto">
								<table className="w-full text-[12px]" aria-label="Beneficiaries preview">
									<thead>
										<tr className="font-mono text-[10px] text-text-tertiary uppercase tracking-[0.12em]">
											<th className="pb-1.5 text-left font-medium">#</th>
											<th className="pb-1.5 text-left font-medium">Address</th>
											<th className="pb-1.5 text-right font-medium">Amount</th>
										</tr>
									</thead>
									<tbody>
										{parsed.rows.map((r, i) => (
											<tr key={`${r.address}-${r.amount}`} className="border-border-hair border-t">
												<td className="py-1.5 text-text-tertiary">{i + 1}</td>
												<td className="py-1.5 font-mono text-text-secondary">
													{r.address.slice(0, 8)}…{r.address.slice(-6)}
												</td>
												<td className="py-1.5 text-right font-mono text-text-primary">
													{r.amount}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</div>
					)}

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
					</div>

					{parsed.totalAmount > 0n && lockDurationSeconds > 0n && (
						<VestingPreview
							amount={formatUnits(parsed.totalAmount, TIP20_DECIMALS)}
							lockDurationDays={Number(durationDays)}
							cliffDurationDays={vestingEnabled && cliffDays ? Number(cliffDays) : 0}
							vestingEnabled={vestingEnabled}
							tokenSymbol={tokenSymbol}
						/>
					)}

					<div className="space-y-2 border-border-hair border-t pt-5">
						<div className="flex items-center justify-between text-[13px]">
							<span className={labelCls}>Batch fee · flat</span>
							<span className="font-mono text-text-primary">~{FEES.batchLock} USDC</span>
						</div>
						<p className="text-[12px] text-text-tertiary">
							One flat fee for the entire batch, regardless of beneficiary count.
						</p>
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
								Insufficient USDC balance to cover the batch fee.
							</p>
						)}
						{insufficientToken && (
							<p className="text-[12px] text-red">
								Insufficient {tokenSymbol ?? "token"} balance to cover total lock amount.
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
			</div>

			<TransactionStatus
				open={txDialogOpen && txState !== "idle"}
				onOpenChange={handleTxDialogClose}
				state={txState}
				txHash={txHash}
				title="Forging batch lock"
				onRetry={error ? handleRetry : undefined}
				error={error ? formatErrorMessage(error, 120) : undefined}
			/>
		</>
	);
}
