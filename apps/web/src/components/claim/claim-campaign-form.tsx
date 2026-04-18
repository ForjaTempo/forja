"use client";

import { PlusIcon, TrashIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type Address, formatUnits, type Hex, isAddress, parseUnits } from "viem";
import { useAccount } from "wagmi";
import { checkCampaignQuota, storeCampaign } from "@/actions/claims";
import { SlugInput } from "@/components/claim/slug-input";
import { TransactionStatus } from "@/components/ui/transaction-status";
import { useCreateCampaign } from "@/hooks/use-create-campaign";
import { useTokenApproval } from "@/hooks/use-token-approval";
import { useTokenBalance } from "@/hooks/use-token-balance";
import { useTokenInfo } from "@/hooks/use-token-info";
import { useUsdcApproval } from "@/hooks/use-usdc-approval";
import { useUsdcBalance } from "@/hooks/use-usdc-balance";
import { FEES, MAX_ACTIVE_CAMPAIGNS_PER_WALLET, TIP20_DECIMALS } from "@/lib/constants";
import { claimerConfig } from "@/lib/contracts";
import { detectDelimiter, stripBom } from "@/lib/csv-utils";
import { deriveTxState, formatErrorMessage } from "@/lib/format";
import { buildMerkleTree, type MerkleResult, normalizeSlug } from "@/lib/merkle";
import { cn } from "@/lib/utils";

const MAX_RECIPIENTS = 5000;
const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;
const VALID_AMOUNT = /^\d+(\.\d{1,18})?$/;

const labelCls = "font-mono text-[11px] uppercase tracking-[0.12em] text-text-tertiary";
const inputCls =
	"w-full rounded-xl border border-border-hair bg-bg-field px-4 py-3 text-[15px] text-text-primary placeholder:text-text-tertiary focus:border-gold/60 focus:outline-none transition-colors";

const goldButtonStyle = {
	background: "linear-gradient(135deg, #ffe5a8, #f0d38a 50%, #e8b860)",
	boxShadow: "0 4px 30px rgba(240,211,138,0.3), inset 0 1px 0 rgba(255,255,255,0.5)",
};
const goldButtonCls =
	"inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 font-semibold text-[#1a1307] text-[15px] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0";
const neutralBtnCls =
	"inline-flex items-center justify-center gap-2 rounded-xl border border-border-hair bg-bg-elevated px-5 py-3 font-medium text-[13px] text-text-secondary transition-colors hover:border-border-subtle hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-50";

type Step = 1 | 2 | 3;
type InputMode = "paste" | "manual";

interface RecipientRow {
	id?: string;
	address: string;
	amount: string;
}

let manualRowSeq = 0;
function makeRowId(): string {
	manualRowSeq += 1;
	return `mr-${manualRowSeq}`;
}

interface ParseResult {
	rows: RecipientRow[];
	errors: string[];
	totalAmount: bigint;
}

function parsePasteText(text: string, decimals: number): ParseResult {
	const cleaned = stripBom(text).trim();
	if (!cleaned) return { rows: [], errors: [], totalAmount: 0n };

	const delimiter = detectDelimiter(cleaned);
	const delimiterRe = delimiter === "\t" ? /\t+/ : new RegExp(`[${delimiter}]+`);
	const lines = cleaned.split("\n").filter((l) => l.trim().length > 0);
	const rows: RecipientRow[] = [];
	const errors: string[] = [];
	let totalAmount = 0n;
	const headerRe = /^(address|recipient|wallet|to)[,;\t]/i;
	const startIdx = lines.length > 0 && headerRe.test(lines[0] as string) ? 1 : 0;

	if (lines.length - startIdx > MAX_RECIPIENTS) {
		errors.push(`Maximum ${MAX_RECIPIENTS} recipients allowed (got ${lines.length - startIdx})`);
		return { rows: [], errors, totalAmount: 0n };
	}

	const seen = new Set<string>();
	for (let i = startIdx; i < lines.length; i++) {
		const parts = (lines[i] as string).split(delimiterRe).map((p) => p.trim());
		const addr = parts[0] ?? "";
		const amt = parts[1] ?? "";
		const lineNum = i + 1;
		if (!ADDRESS_RE.test(addr)) {
			errors.push(`Line ${lineNum}: invalid address`);
			continue;
		}
		if (!VALID_AMOUNT.test(amt) || Number(amt) <= 0) {
			errors.push(`Line ${lineNum}: invalid amount`);
			continue;
		}
		const key = addr.toLowerCase();
		if (seen.has(key)) {
			errors.push(`Line ${lineNum}: duplicate address (will be summed)`);
		}
		seen.add(key);
		try {
			totalAmount += parseUnits(amt, decimals);
			rows.push({ address: addr, amount: amt });
		} catch {
			errors.push(`Line ${lineNum}: amount precision exceeds token decimals`);
		}
	}
	return { rows, errors, totalAmount };
}

function parseManualRows(manual: RecipientRow[], decimals: number): ParseResult {
	const rows: RecipientRow[] = [];
	const errors: string[] = [];
	let totalAmount = 0n;
	const nonEmpty = manual.filter((r) => r.address.trim());
	if (nonEmpty.length === 0) return { rows: [], errors: [], totalAmount: 0n };
	if (nonEmpty.length > MAX_RECIPIENTS) {
		errors.push(`Maximum ${MAX_RECIPIENTS} recipients allowed`);
		return { rows: [], errors, totalAmount: 0n };
	}
	for (let i = 0; i < nonEmpty.length; i++) {
		const r = nonEmpty[i] as RecipientRow;
		const addr = r.address.trim();
		const amt = r.amount.trim();
		if (!ADDRESS_RE.test(addr)) {
			errors.push(`Row ${i + 1}: invalid address`);
			continue;
		}
		if (!VALID_AMOUNT.test(amt) || Number(amt) <= 0) {
			errors.push(`Row ${i + 1}: invalid amount`);
			continue;
		}
		try {
			totalAmount += parseUnits(amt, decimals);
			rows.push({ address: addr, amount: amt });
		} catch {
			errors.push(`Row ${i + 1}: amount precision exceeds token decimals`);
		}
	}
	return { rows, errors, totalAmount };
}

interface ClaimCampaignFormProps {
	initialToken?: string;
}

export function ClaimCampaignForm({ initialToken }: ClaimCampaignFormProps) {
	const router = useRouter();
	const { isConnected, address: walletAddress } = useAccount();

	const [step, setStep] = useState<Step>(1);
	const [tokenAddress, setTokenAddress] = useState(initialToken ?? "");
	const [inputMode, setInputMode] = useState<InputMode>("paste");
	const [pasteText, setPasteText] = useState("");
	const [manualRows, setManualRows] = useState<RecipientRow[]>(() => [
		{ id: makeRowId(), address: "", amount: "" },
	]);
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [bannerUrl, setBannerUrl] = useState("");
	const [slug, setSlug] = useState("");
	const [slugValid, setSlugValid] = useState(false);
	const [startTimeStr, setStartTimeStr] = useState("");
	const [endTimeStr, setEndTimeStr] = useState("");
	const [noExpiry, setNoExpiry] = useState(true);
	const [sweepEnabled, setSweepEnabled] = useState(false);
	const [merkleResult, setMerkleResult] = useState<MerkleResult | null>(null);
	const [merkleError, setMerkleError] = useState<string | null>(null);
	const [quotaError, setQuotaError] = useState<string | null>(null);
	const [storeError, setStoreError] = useState<string | null>(null);
	const [isStoring, setIsStoring] = useState(false);
	const [txDialogOpen, setTxDialogOpen] = useState(false);
	const successFired = useRef(false);

	const validTokenAddress = isAddress(tokenAddress) ? (tokenAddress as Hex) : undefined;
	const {
		symbol: tokenSymbol,
		decimals: tokenDecimals,
		isError: isTokenError,
	} = useTokenInfo(validTokenAddress);
	const { balance: tokenBalance } = useTokenBalance(validTokenAddress);
	const { balance: usdcBalance } = useUsdcBalance();

	const decimals = tokenDecimals ?? TIP20_DECIMALS;

	const parsed = useMemo(
		() =>
			inputMode === "paste"
				? parsePasteText(pasteText, decimals)
				: parseManualRows(manualRows, decimals),
		[inputMode, pasteText, manualRows, decimals],
	);

	const feeAmount = parseUnits(String(FEES.claimCampaign), TIP20_DECIMALS);

	const {
		needsApproval: needsUsdcApproval,
		approve: approveUsdc,
		isApproving: isUsdcApproving,
		isApprovalConfirming: isUsdcApprovalConfirming,
	} = useUsdcApproval({ spender: claimerConfig.address, amount: feeAmount });

	const {
		needsApproval: needsTokenApproval,
		approve: approveToken,
		isApproving: isTokenApproving,
		isApprovalConfirming: isTokenApprovalConfirming,
	} = useTokenApproval({
		tokenAddress: validTokenAddress,
		spender: claimerConfig.address,
		amount: parsed.totalAmount,
	});

	const {
		createCampaign,
		isCreating,
		isConfirming,
		isSuccess,
		txHash,
		campaignId,
		createdBlock,
		error: createError,
		reset: resetCreate,
	} = useCreateCampaign();

	const insufficientUsdc = usdcBalance !== undefined && usdcBalance < feeAmount;
	const insufficientToken =
		tokenBalance !== undefined && parsed.totalAmount > 0n && tokenBalance < parsed.totalAmount;

	const startUnix = useMemo(() => {
		if (!startTimeStr) return 0;
		const ms = Date.parse(startTimeStr);
		return Number.isFinite(ms) ? Math.floor(ms / 1000) : 0;
	}, [startTimeStr]);
	const endUnix = useMemo(() => {
		if (noExpiry || !endTimeStr) return 0;
		const ms = Date.parse(endTimeStr);
		return Number.isFinite(ms) ? Math.floor(ms / 1000) : 0;
	}, [noExpiry, endTimeStr]);

	const step1Valid =
		!!validTokenAddress &&
		!isTokenError &&
		parsed.rows.length > 0 &&
		parsed.errors.length === 0 &&
		parsed.totalAmount > 0n;

	const step2Valid =
		title.trim().length > 0 &&
		title.length <= 80 &&
		(!description || description.length <= 300) &&
		(!bannerUrl || /^https:\/\//i.test(bannerUrl)) &&
		slugValid &&
		(noExpiry || (!!endUnix && endUnix > (startUnix || Math.floor(Date.now() / 1000)))) &&
		(!sweepEnabled || !noExpiry);

	const handleAddRow = useCallback(() => {
		setManualRows((rows) => [...rows, { id: makeRowId(), address: "", amount: "" }]);
	}, []);

	const handleRemoveRow = useCallback((idx: number) => {
		setManualRows((rows) => rows.filter((_, i) => i !== idx));
	}, []);

	const handleRowChange = useCallback((idx: number, field: keyof RecipientRow, value: string) => {
		setManualRows((rows) => rows.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
	}, []);

	const handleNext = useCallback(() => {
		if (step === 1 && step1Valid) setStep(2);
		else if (step === 2 && step2Valid) setStep(3);
	}, [step, step1Valid, step2Valid]);

	const handleBack = useCallback(() => {
		if (step === 2) setStep(1);
		else if (step === 3) setStep(2);
	}, [step]);

	useEffect(() => {
		if (step !== 3) return;
		if (parsed.rows.length === 0) return;
		try {
			const recipients = parsed.rows.map((r) => ({
				address: r.address as Address,
				amount: parseUnits(r.amount, decimals),
			}));
			const result = buildMerkleTree(recipients);
			setMerkleResult(result);
			setMerkleError(null);
		} catch (err) {
			setMerkleError(err instanceof Error ? err.message : "Failed to build merkle tree");
			setMerkleResult(null);
		}
	}, [step, parsed.rows, decimals]);

	useEffect(() => {
		if (step !== 3 || !walletAddress) return;
		(async () => {
			const quota = await checkCampaignQuota(walletAddress);
			if (quota.atLimit) {
				setQuotaError(
					`You already have ${quota.activeCount} active campaigns (max ${MAX_ACTIVE_CAMPAIGNS_PER_WALLET})`,
				);
			} else {
				setQuotaError(null);
			}
		})();
	}, [step, walletAddress]);

	const handleDeploy = useCallback(() => {
		if (!validTokenAddress || !merkleResult) return;
		successFired.current = false;
		setTxDialogOpen(true);
		const start = startUnix || Math.floor(Date.now() / 1000);
		createCampaign(
			validTokenAddress,
			merkleResult.root,
			merkleResult.total,
			BigInt(start),
			BigInt(endUnix),
			sweepEnabled && !noExpiry,
		);
	}, [validTokenAddress, merkleResult, startUnix, endUnix, sweepEnabled, noExpiry, createCampaign]);

	useEffect(() => {
		if (!isSuccess || !txHash || !campaignId || !merkleResult || !validTokenAddress) return;
		if (successFired.current) return;
		successFired.current = true;
		setIsStoring(true);
		(async () => {
			try {
				const start = startUnix || Math.floor(Date.now() / 1000);
				const result = await storeCampaign({
					campaignId: campaignId.toString(),
					slug: normalizeSlug(slug),
					creatorAddress: walletAddress ?? "",
					tokenAddress: validTokenAddress,
					tokenDecimals: decimals,
					merkleRoot: merkleResult.root,
					totalDeposited: merkleResult.total.toString(),
					recipientCount: merkleResult.leaves.length,
					title: title.trim(),
					description: description.trim() || null,
					bannerUrl: bannerUrl.trim() || null,
					startTime: start,
					endTime: endUnix > 0 ? endUnix : null,
					sweepEnabled: sweepEnabled && !noExpiry,
					createdBlock: createdBlock ?? 0,
					createdTxHash: txHash,
					leaves: merkleResult.leaves.map((l) => ({
						recipientAddress: l.address,
						amount: l.amount.toString(),
						proof: l.proof,
						leafIndex: l.index,
					})),
				});
				if (!result.ok) {
					setStoreError(result.error ?? "Failed to save campaign");
				} else {
					setTxDialogOpen(false);
					router.push(`/claim/${normalizeSlug(slug)}`);
				}
			} catch (err) {
				setStoreError(err instanceof Error ? err.message : "Failed to save campaign");
			} finally {
				setIsStoring(false);
			}
		})();
	}, [
		isSuccess,
		txHash,
		campaignId,
		merkleResult,
		validTokenAddress,
		walletAddress,
		startUnix,
		endUnix,
		sweepEnabled,
		noExpiry,
		slug,
		title,
		description,
		bannerUrl,
		decimals,
		createdBlock,
		router,
	]);

	const handleSubmit = useCallback((e: FormEvent) => {
		e.preventDefault();
	}, []);

	const txState = deriveTxState(
		isCreating,
		isConfirming || isStoring,
		isSuccess && !isStoring,
		createError,
	);

	const totalFormatted = parsed.totalAmount > 0n ? formatUnits(parsed.totalAmount, decimals) : "0";

	if (!isConnected) {
		return (
			<div className="rounded-2xl border border-border-hair bg-bg-elevated p-10 text-center text-[13px] text-text-tertiary">
				Connect your wallet to forge a claim campaign.
			</div>
		);
	}

	const steps = [
		{ n: 1, label: "Recipients" },
		{ n: 2, label: "Details" },
		{ n: 3, label: "Deploy" },
	] as const;

	return (
		<form onSubmit={handleSubmit} className="space-y-6">
			<div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em]">
				{steps.map((s, i) => {
					const active = step >= s.n;
					return (
						<div key={s.n} className="flex items-center gap-2">
							<div className="flex items-center gap-2">
								<span
									className={cn(
										"flex size-5 items-center justify-center rounded-full border text-[10px]",
										active
											? "border-ember/40 bg-ember/10 text-ember"
											: "border-border-hair bg-bg-field text-text-tertiary",
									)}
								>
									{s.n}
								</span>
								<span className={active ? "text-text-primary" : "text-text-tertiary"}>
									{s.label}
								</span>
							</div>
							{i < steps.length - 1 && <span className="text-text-tertiary">→</span>}
						</div>
					);
				})}
			</div>

			<div className="rounded-2xl border border-border-hair bg-bg-elevated p-6 shadow-[0_20px_60px_rgba(0,0,0,0.4)] sm:p-8">
				{step === 1 && (
					<div className="space-y-5">
						<div className="space-y-2">
							<label htmlFor="token-addr" className={labelCls}>
								Token address
							</label>
							<input
								id="token-addr"
								type="text"
								placeholder="0x…"
								value={tokenAddress}
								onChange={(e) => setTokenAddress(e.target.value)}
								className={cn(inputCls, "font-mono text-[14px]")}
								spellCheck={false}
								autoComplete="off"
							/>
							{validTokenAddress && tokenSymbol && (
								<p className="text-[12px] text-text-tertiary">
									{tokenSymbol} · {decimals} decimals
								</p>
							)}
							{isTokenError && <p className="text-[12px] text-red">Could not load token info.</p>}
						</div>

						<div className="space-y-2">
							<span className={labelCls}>Recipients</span>
							<div
								className="flex gap-1 rounded-xl border border-border-hair bg-bg-field p-1"
								role="tablist"
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
							<textarea
								className="min-h-[160px] w-full rounded-xl border border-border-hair bg-bg-field px-4 py-3 font-mono text-[13px] text-text-primary placeholder:text-text-tertiary focus:border-gold/60 focus:outline-none transition-colors"
								placeholder="0xabc…,100&#10;0xdef…,250"
								value={pasteText}
								onChange={(e) => setPasteText(e.target.value)}
								spellCheck={false}
							/>
						) : (
							<div className="space-y-2">
								{manualRows.map((row, i) => (
									<div key={row.id ?? `row-${i}`} className="flex items-center gap-2">
										<input
											type="text"
											placeholder="0x…"
											value={row.address}
											onChange={(e) => handleRowChange(i, "address", e.target.value)}
											className={cn(inputCls, "flex-[2] py-2.5 font-mono text-[13px]")}
											spellCheck={false}
											autoComplete="off"
										/>
										<input
											type="text"
											placeholder="Amount"
											value={row.amount}
											onChange={(e) => handleRowChange(i, "amount", e.target.value)}
											className={cn(inputCls, "w-32 py-2.5 font-mono text-[13px]")}
											inputMode="decimal"
											autoComplete="off"
										/>
										<button
											type="button"
											className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-border-hair bg-bg-field text-text-tertiary transition-colors hover:border-border-subtle hover:text-red disabled:cursor-not-allowed disabled:opacity-40"
											onClick={() => handleRemoveRow(i)}
											disabled={manualRows.length === 1}
											aria-label={`Remove row ${i + 1}`}
										>
											<TrashIcon className="size-3.5" />
										</button>
									</div>
								))}
								<button
									type="button"
									className="inline-flex items-center gap-1.5 rounded-lg border border-border-hair bg-bg-field px-3 py-2 text-[12px] font-medium text-text-secondary transition-colors hover:border-border-subtle hover:text-text-primary"
									onClick={handleAddRow}
								>
									<PlusIcon className="size-3" />
									Add row
								</button>
							</div>
						)}

						{parsed.errors.length > 0 && (
							<div className="space-y-1" role="alert">
								{parsed.errors.slice(0, 5).map((err) => (
									<p key={err} className="text-[12px] text-red">
										{err}
									</p>
								))}
								{parsed.errors.length > 5 && (
									<p className="text-[12px] text-text-tertiary">
										… and {parsed.errors.length - 5} more errors
									</p>
								)}
							</div>
						)}

						<div className="flex items-center justify-between border-border-hair border-t pt-4 text-[13px]">
							<span className="text-text-tertiary">
								{parsed.rows.length} {parsed.rows.length === 1 ? "recipient" : "recipients"}
							</span>
							<span className="font-mono text-text-primary">
								Total {totalFormatted} {tokenSymbol ?? ""}
							</span>
						</div>
						{insufficientToken && (
							<p className="text-[12px] text-red">Insufficient token balance.</p>
						)}

						<div className="flex justify-end">
							<button
								type="button"
								onClick={handleNext}
								disabled={!step1Valid}
								className={goldButtonCls}
								style={goldButtonStyle}
							>
								Continue to details
							</button>
						</div>
					</div>
				)}

				{step === 2 && (
					<div className="space-y-5">
						<div className="space-y-2">
							<label htmlFor="title" className={labelCls}>
								Title
							</label>
							<input
								id="title"
								type="text"
								maxLength={80}
								placeholder="My airdrop campaign"
								value={title}
								onChange={(e) => setTitle(e.target.value)}
								className={inputCls}
								autoComplete="off"
							/>
						</div>
						<div className="space-y-2">
							<label htmlFor="desc" className={labelCls}>
								Description · optional
							</label>
							<textarea
								id="desc"
								className="h-24 w-full rounded-xl border border-border-hair bg-bg-field px-4 py-3 text-[14px] text-text-primary placeholder:text-text-tertiary focus:border-gold/60 focus:outline-none transition-colors"
								maxLength={300}
								value={description}
								onChange={(e) => setDescription(e.target.value)}
							/>
						</div>
						<div className="space-y-2">
							<label htmlFor="banner" className={labelCls}>
								Banner URL · optional
							</label>
							<input
								id="banner"
								type="url"
								placeholder="https://example.com/banner.png"
								value={bannerUrl}
								onChange={(e) => setBannerUrl(e.target.value)}
								className={cn(inputCls, "font-mono text-[13px]")}
								autoComplete="off"
							/>
						</div>

						<SlugInput value={slug} onChange={setSlug} onValidityChange={setSlugValid} />

						<div className="grid grid-cols-2 gap-3">
							<div className="space-y-2">
								<label htmlFor="start" className={labelCls}>
									Start · optional
								</label>
								<input
									id="start"
									type="datetime-local"
									value={startTimeStr}
									onChange={(e) => setStartTimeStr(e.target.value)}
									className={cn(inputCls, "text-[13px]")}
								/>
							</div>
							<div className="space-y-2">
								<label htmlFor="end" className={labelCls}>
									End
								</label>
								<input
									id="end"
									type="datetime-local"
									value={endTimeStr}
									onChange={(e) => setEndTimeStr(e.target.value)}
									disabled={noExpiry}
									className={cn(
										inputCls,
										"text-[13px] disabled:cursor-not-allowed disabled:opacity-50",
									)}
								/>
							</div>
						</div>

						<label className="flex cursor-pointer items-center gap-2 text-[13px] text-text-secondary">
							<input
								type="checkbox"
								checked={noExpiry}
								onChange={(e) => {
									setNoExpiry(e.target.checked);
									if (e.target.checked) setSweepEnabled(false);
								}}
								className="size-3.5 accent-ember"
							/>
							No expiry
						</label>

						<label className="flex cursor-pointer items-center gap-2 text-[13px] text-text-secondary">
							<input
								type="checkbox"
								checked={sweepEnabled}
								onChange={(e) => setSweepEnabled(e.target.checked)}
								disabled={noExpiry}
								className="size-3.5 accent-ember disabled:cursor-not-allowed disabled:opacity-50"
							/>
							Allow sweep of unclaimed tokens after end (requires end time)
						</label>

						<div className="flex justify-between pt-2">
							<button type="button" onClick={handleBack} className={neutralBtnCls}>
								Back
							</button>
							<button
								type="button"
								onClick={handleNext}
								disabled={!step2Valid}
								className={goldButtonCls}
								style={{ ...goldButtonStyle, width: "auto" }}
							>
								Continue to deploy
							</button>
						</div>
					</div>
				)}

				{step === 3 && (
					<div className="space-y-5">
						<div className="space-y-1">
							<div className={labelCls}>Review</div>
							<h3 className="font-display text-[22px] tracking-[-0.01em] text-text-primary">
								Ready to light up the forge?
							</h3>
						</div>
						<dl className="space-y-2.5 rounded-xl border border-border-hair bg-bg-field/60 p-4 text-[13px]">
							<div className="flex justify-between">
								<dt className="text-text-tertiary">Token</dt>
								<dd className="font-mono text-text-primary">
									{tokenSymbol ?? tokenAddress.slice(0, 10)}
								</dd>
							</div>
							<div className="flex justify-between">
								<dt className="text-text-tertiary">Recipients</dt>
								<dd className="font-mono text-text-primary">{parsed.rows.length}</dd>
							</div>
							<div className="flex justify-between">
								<dt className="text-text-tertiary">Total amount</dt>
								<dd className="font-mono text-text-primary">
									{totalFormatted} {tokenSymbol ?? ""}
								</dd>
							</div>
							<div className="flex justify-between">
								<dt className="text-text-tertiary">Slug</dt>
								<dd className="font-mono text-ember">/{normalizeSlug(slug) || "my-airdrop"}</dd>
							</div>
							<div className="flex justify-between">
								<dt className="text-text-tertiary">Fee</dt>
								<dd className="font-mono text-text-primary">~{FEES.claimCampaign} USDC · Est.</dd>
							</div>
						</dl>

						{merkleError && <p className="text-[12px] text-red">{merkleError}</p>}
						{quotaError && <p className="text-[12px] text-red">{quotaError}</p>}
						{storeError && <p className="text-[12px] text-red">{storeError}</p>}
						{insufficientUsdc && <p className="text-[12px] text-red">Insufficient USDC for fee.</p>}
						{insufficientToken && (
							<p className="text-[12px] text-red">Insufficient token balance.</p>
						)}

						<div className="space-y-2">
							{needsUsdcApproval && (
								<button
									type="button"
									className={goldButtonCls}
									style={goldButtonStyle}
									onClick={approveUsdc}
									disabled={isUsdcApproving || isUsdcApprovalConfirming}
								>
									{isUsdcApproving || isUsdcApprovalConfirming
										? "Approving USDC…"
										: "Approve USDC fee (1/3)"}
								</button>
							)}
							{!needsUsdcApproval && needsTokenApproval && (
								<button
									type="button"
									className={goldButtonCls}
									style={goldButtonStyle}
									onClick={approveToken}
									disabled={isTokenApproving || isTokenApprovalConfirming}
								>
									{isTokenApproving || isTokenApprovalConfirming
										? "Approving token…"
										: "Approve token deposit (2/3)"}
								</button>
							)}
							{!needsUsdcApproval && !needsTokenApproval && (
								<button
									type="button"
									className={goldButtonCls}
									style={goldButtonStyle}
									onClick={handleDeploy}
									disabled={
										!merkleResult ||
										!!quotaError ||
										insufficientUsdc ||
										insufficientToken ||
										isCreating ||
										isConfirming ||
										isStoring
									}
								>
									{isCreating || isConfirming
										? "Forging campaign…"
										: isStoring
											? "Saving…"
											: "Forge campaign (3/3)"}
								</button>
							)}
						</div>

						<div className="flex justify-start">
							<button type="button" onClick={handleBack} className={neutralBtnCls}>
								Back
							</button>
						</div>
					</div>
				)}
			</div>

			<TransactionStatus
				open={txDialogOpen}
				onOpenChange={(open) => {
					setTxDialogOpen(open);
					if (!open) {
						resetCreate();
					}
				}}
				state={txState}
				txHash={txHash}
				title="Forging campaign"
				error={createError ? formatErrorMessage(createError) : (storeError ?? undefined)}
			/>
		</form>
	);
}
