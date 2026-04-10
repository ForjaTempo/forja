"use client";

import { PlusIcon, TrashIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type Address, formatUnits, type Hex, isAddress, parseUnits } from "viem";
import { useAccount } from "wagmi";
import { checkCampaignQuota, storeCampaign } from "@/actions/claims";
import { SlugInput } from "@/components/claim/slug-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
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

const MAX_RECIPIENTS = 5000;
const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;
const VALID_AMOUNT = /^\d+(\.\d{1,18})?$/;

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

	// Build merkle tree when reaching step 3
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

	// Quota check on step 3
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

	// After tx success, store campaign in DB
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
			<Card>
				<CardContent className="py-10 text-center text-smoke-dark">
					Connect your wallet to create a claim campaign.
				</CardContent>
			</Card>
		);
	}

	return (
		<form onSubmit={handleSubmit} className="space-y-6">
			<div className="flex items-center gap-2 text-sm">
				<span className={step >= 1 ? "font-semibold text-foreground" : "text-smoke-dark"}>
					1. Token & Recipients
				</span>
				<span className="text-smoke-dark">→</span>
				<span className={step >= 2 ? "font-semibold text-foreground" : "text-smoke-dark"}>
					2. Details
				</span>
				<span className="text-smoke-dark">→</span>
				<span className={step >= 3 ? "font-semibold text-foreground" : "text-smoke-dark"}>
					3. Deploy
				</span>
			</div>

			{step === 1 && (
				<Card>
					<CardContent className="space-y-4 py-6">
						<div className="space-y-1.5">
							<label htmlFor="token-addr" className="block text-sm font-medium">
								Token Address
							</label>
							<Input
								id="token-addr"
								type="text"
								placeholder="0x..."
								value={tokenAddress}
								onChange={(e) => setTokenAddress(e.target.value)}
							/>
							{validTokenAddress && tokenSymbol && (
								<p className="text-xs text-smoke-dark">
									{tokenSymbol} • decimals: {decimals}
								</p>
							)}
							{isTokenError && <p className="text-xs text-rose-500">Could not load token info</p>}
						</div>

						<div className="flex gap-2 text-sm">
							<button
								type="button"
								className={inputMode === "paste" ? "font-semibold underline" : "text-smoke-dark"}
								onClick={() => setInputMode("paste")}
							>
								Paste / CSV
							</button>
							<button
								type="button"
								className={inputMode === "manual" ? "font-semibold underline" : "text-smoke-dark"}
								onClick={() => setInputMode("manual")}
							>
								Manual
							</button>
						</div>

						{inputMode === "paste" ? (
							<textarea
								className="h-40 w-full rounded-md border border-border bg-background p-3 text-sm font-mono"
								placeholder="0xabc...,100&#10;0xdef...,250"
								value={pasteText}
								onChange={(e) => setPasteText(e.target.value)}
							/>
						) : (
							<div className="space-y-2">
								{manualRows.map((row, i) => (
									<div key={row.id ?? `row-${i}`} className="flex gap-2">
										<Input
											placeholder="0x..."
											value={row.address}
											onChange={(e) => handleRowChange(i, "address", e.target.value)}
										/>
										<Input
											placeholder="amount"
											value={row.amount}
											onChange={(e) => handleRowChange(i, "amount", e.target.value)}
											className="w-32"
										/>
										<Button
											type="button"
											variant="outline"
											size="icon"
											onClick={() => handleRemoveRow(i)}
											disabled={manualRows.length === 1}
										>
											<TrashIcon className="size-4" />
										</Button>
									</div>
								))}
								<Button type="button" variant="outline" size="sm" onClick={handleAddRow}>
									<PlusIcon className="mr-1 size-4" /> Add row
								</Button>
							</div>
						)}

						{parsed.errors.length > 0 && (
							<div className="space-y-1 text-xs text-rose-500">
								{parsed.errors.slice(0, 5).map((err) => (
									<p key={err}>{err}</p>
								))}
								{parsed.errors.length > 5 && <p>... and {parsed.errors.length - 5} more errors</p>}
							</div>
						)}

						<Separator />
						<div className="flex justify-between text-sm">
							<span>{parsed.rows.length} recipients</span>
							<span>
								Total: {totalFormatted} {tokenSymbol ?? ""}
							</span>
						</div>
						{insufficientToken && (
							<p className="text-xs text-rose-500">Insufficient token balance</p>
						)}

						<div className="flex justify-end">
							<Button type="button" onClick={handleNext} disabled={!step1Valid}>
								Next
							</Button>
						</div>
					</CardContent>
				</Card>
			)}

			{step === 2 && (
				<Card>
					<CardContent className="space-y-4 py-6">
						<div className="space-y-1.5">
							<label htmlFor="title" className="block text-sm font-medium">
								Title
							</label>
							<Input
								id="title"
								type="text"
								maxLength={80}
								placeholder="My Airdrop Campaign"
								value={title}
								onChange={(e) => setTitle(e.target.value)}
							/>
						</div>
						<div className="space-y-1.5">
							<label htmlFor="desc" className="block text-sm font-medium">
								Description (optional)
							</label>
							<textarea
								id="desc"
								className="h-20 w-full rounded-md border border-border bg-background p-3 text-sm"
								maxLength={300}
								value={description}
								onChange={(e) => setDescription(e.target.value)}
							/>
						</div>
						<div className="space-y-1.5">
							<label htmlFor="banner" className="block text-sm font-medium">
								Banner URL (optional, https://)
							</label>
							<Input
								id="banner"
								type="url"
								placeholder="https://example.com/banner.png"
								value={bannerUrl}
								onChange={(e) => setBannerUrl(e.target.value)}
							/>
						</div>

						<SlugInput value={slug} onChange={setSlug} onValidityChange={setSlugValid} />

						<div className="grid grid-cols-2 gap-3">
							<div className="space-y-1.5">
								<label htmlFor="start" className="block text-sm font-medium">
									Start (optional)
								</label>
								<Input
									id="start"
									type="datetime-local"
									value={startTimeStr}
									onChange={(e) => setStartTimeStr(e.target.value)}
								/>
							</div>
							<div className="space-y-1.5">
								<label htmlFor="end" className="block text-sm font-medium">
									End
								</label>
								<Input
									id="end"
									type="datetime-local"
									value={endTimeStr}
									onChange={(e) => setEndTimeStr(e.target.value)}
									disabled={noExpiry}
								/>
							</div>
						</div>

						<label className="flex items-center gap-2 text-sm">
							<input
								type="checkbox"
								checked={noExpiry}
								onChange={(e) => {
									setNoExpiry(e.target.checked);
									if (e.target.checked) setSweepEnabled(false);
								}}
							/>
							No expiry
						</label>

						<label className="flex items-center gap-2 text-sm">
							<input
								type="checkbox"
								checked={sweepEnabled}
								onChange={(e) => setSweepEnabled(e.target.checked)}
								disabled={noExpiry}
							/>
							Allow sweep of unclaimed tokens after end (requires end time)
						</label>

						<div className="flex justify-between">
							<Button type="button" variant="outline" onClick={handleBack}>
								Back
							</Button>
							<Button type="button" onClick={handleNext} disabled={!step2Valid}>
								Next
							</Button>
						</div>
					</CardContent>
				</Card>
			)}

			{step === 3 && (
				<Card>
					<CardContent className="space-y-4 py-6">
						<h3 className="font-semibold">Review & Deploy</h3>
						<dl className="grid grid-cols-2 gap-2 text-sm">
							<dt className="text-smoke-dark">Token</dt>
							<dd>{tokenSymbol ?? tokenAddress}</dd>
							<dt className="text-smoke-dark">Recipients</dt>
							<dd>{parsed.rows.length}</dd>
							<dt className="text-smoke-dark">Total amount</dt>
							<dd>
								{totalFormatted} {tokenSymbol ?? ""}
							</dd>
							<dt className="text-smoke-dark">Slug</dt>
							<dd>forja.fun/claim/{normalizeSlug(slug)}</dd>
							<dt className="text-smoke-dark">Fee</dt>
							<dd>~ {FEES.claimCampaign} USDC (Est.)</dd>
						</dl>

						{merkleError && <p className="text-xs text-rose-500">{merkleError}</p>}
						{quotaError && <p className="text-xs text-rose-500">{quotaError}</p>}
						{storeError && <p className="text-xs text-rose-500">{storeError}</p>}
						{insufficientUsdc && <p className="text-xs text-rose-500">Insufficient USDC for fee</p>}
						{insufficientToken && (
							<p className="text-xs text-rose-500">Insufficient token balance</p>
						)}

						<div className="space-y-2">
							{needsUsdcApproval && (
								<Button
									type="button"
									className="w-full"
									onClick={approveUsdc}
									disabled={isUsdcApproving || isUsdcApprovalConfirming}
								>
									{isUsdcApproving || isUsdcApprovalConfirming
										? "Approving USDC..."
										: "1. Approve USDC fee"}
								</Button>
							)}
							{!needsUsdcApproval && needsTokenApproval && (
								<Button
									type="button"
									className="w-full"
									onClick={approveToken}
									disabled={isTokenApproving || isTokenApprovalConfirming}
								>
									{isTokenApproving || isTokenApprovalConfirming
										? "Approving token..."
										: "2. Approve token deposit"}
								</Button>
							)}
							{!needsUsdcApproval && !needsTokenApproval && (
								<Button
									type="button"
									className="w-full"
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
										? "Creating campaign..."
										: isStoring
											? "Saving..."
											: "3. Create campaign"}
								</Button>
							)}
						</div>

						<div className="flex justify-between">
							<Button type="button" variant="outline" onClick={handleBack}>
								Back
							</Button>
						</div>
					</CardContent>
				</Card>
			)}

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
				title="Create claim campaign"
				error={createError ? formatErrorMessage(createError) : (storeError ?? undefined)}
			/>
		</form>
	);
}
