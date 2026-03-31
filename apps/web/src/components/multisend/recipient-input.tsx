"use client";

import { PlusIcon, TrashIcon, UploadIcon, XIcon } from "lucide-react";
import { type ChangeEvent, useCallback, useMemo, useRef } from "react";
import type { Hex } from "viem";
import { formatUnits, parseUnits } from "viem";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TIP20_DECIMALS } from "@/lib/constants";

const MAX_RECIPIENTS = 500;
const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;
const AMOUNT_RE = /^\d+(\.\d{1,6})?$/;
const HEADER_RE = /^(address|recipient|wallet|to)[,\t]/i;

export interface Recipient {
	address: Hex;
	amount: string;
}

export interface ParseResult {
	recipients: Recipient[];
	totalAmount: bigint;
	errors: string[];
	warnings: string[];
}

type InputMode = "paste" | "manual";

export interface ManualRow {
	address: string;
	amount: string;
}

function isHeaderRow(line: string): boolean {
	return HEADER_RE.test(line) || line.toLowerCase().includes("amount");
}

/**
 * Parse text lines into recipients.
 * When addressOnly=true (equal distribution), only address is required per line.
 */
function parseLines(text: string, addressOnly = false): ParseResult {
	const rawLines = text
		.split("\n")
		.map((l) => l.trim())
		.filter((l) => l.length > 0);

	// Skip header row if detected
	const lines =
		rawLines.length > 0 && isHeaderRow(rawLines[0] as string) ? rawLines.slice(1) : rawLines;

	const recipients: Recipient[] = [];
	const errors: string[] = [];
	const warnings: string[] = [];
	let totalAmount = 0n;
	const seenAddresses = new Set<string>();

	if (lines.length > MAX_RECIPIENTS) {
		errors.push(`Maximum ${MAX_RECIPIENTS} recipients allowed (got ${lines.length})`);
		return { recipients: [], totalAmount: 0n, errors, warnings };
	}

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i] as string;
		const lineNum = rawLines.length !== lines.length ? i + 2 : i + 1;

		const parts = line.split(/[,\t]+/).map((p) => p.trim());
		const addr = parts[0] ?? "";
		const amt = parts[1] ?? "";

		if (!addr) {
			errors.push(`Line ${lineNum}: Address is required`);
			continue;
		}

		if (!addressOnly && !amt) {
			errors.push(`Line ${lineNum}: Expected "address,amount" format`);
			continue;
		}

		if (!ADDRESS_RE.test(addr)) {
			errors.push(`Line ${lineNum}: Invalid address "${addr.slice(0, 10)}..."`);
			continue;
		}

		if (!addressOnly) {
			if (!AMOUNT_RE.test(amt) || Number(amt) <= 0) {
				errors.push(`Line ${lineNum}: Invalid amount "${amt}"`);
				continue;
			}
		}

		const lowerAddr = addr.toLowerCase();
		if (seenAddresses.has(lowerAddr)) {
			warnings.push(`Line ${lineNum}: Duplicate address ${addr.slice(0, 8)}...`);
		}
		seenAddresses.add(lowerAddr);

		if (!addressOnly && amt) {
			const parsed = parseUnits(amt, TIP20_DECIMALS);
			totalAmount += parsed;
		}
		recipients.push({ address: addr as Hex, amount: addressOnly ? "0" : amt });
	}

	return { recipients, totalAmount, errors, warnings };
}

/**
 * Parse manual rows into recipients.
 * When addressOnly=true (equal distribution), only address is required per row.
 */
function parseManualRows(rows: ManualRow[], addressOnly = false): ParseResult {
	const recipients: Recipient[] = [];
	const errors: string[] = [];
	const warnings: string[] = [];
	let totalAmount = 0n;
	const seenAddresses = new Set<string>();

	const nonEmptyRows = rows.filter((r) => r.address.trim() || (!addressOnly && r.amount.trim()));

	for (let i = 0; i < nonEmptyRows.length; i++) {
		const row = nonEmptyRows[i] as ManualRow;
		const rowNum = i + 1;
		const addr = row.address.trim();
		const amt = row.amount.trim();

		if (!addr) {
			errors.push(`Row ${rowNum}: Address is required`);
			continue;
		}

		if (!addressOnly && !amt) {
			errors.push(`Row ${rowNum}: Both address and amount are required`);
			continue;
		}

		if (!ADDRESS_RE.test(addr)) {
			errors.push(`Row ${rowNum}: Invalid address`);
			continue;
		}

		if (!addressOnly && amt) {
			if (!AMOUNT_RE.test(amt) || Number(amt) <= 0) {
				errors.push(`Row ${rowNum}: Invalid amount`);
				continue;
			}
		}

		const lowerAddr = addr.toLowerCase();
		if (seenAddresses.has(lowerAddr)) {
			warnings.push(`Row ${rowNum}: Duplicate address ${addr.slice(0, 8)}...`);
		}
		seenAddresses.add(lowerAddr);

		if (!addressOnly && amt) {
			const parsed = parseUnits(amt, TIP20_DECIMALS);
			totalAmount += parsed;
		}
		recipients.push({ address: addr as Hex, amount: addressOnly ? "0" : amt });
	}

	return { recipients, totalAmount, errors, warnings };
}

interface RecipientInputProps {
	value: string;
	onChange: (value: string) => void;
	manualRows: ManualRow[];
	onManualRowsChange: (rows: ManualRow[]) => void;
	inputMode: InputMode;
	onInputModeChange: (mode: InputMode) => void;
	tokenSymbol: string | undefined;
	addressOnly: boolean;
	/** When provided, preview uses this instead of internal parse result */
	displayParsed?: ParseResult;
}

export function RecipientInput({
	value,
	onChange,
	manualRows,
	onManualRowsChange,
	inputMode,
	onInputModeChange,
	tokenSymbol,
	addressOnly,
	displayParsed,
}: RecipientInputProps) {
	const fileInputRef = useRef<HTMLInputElement>(null);

	const internalParsed = useMemo(
		() =>
			inputMode === "paste"
				? parseLines(value, addressOnly)
				: parseManualRows(manualRows, addressOnly),
		[inputMode, value, manualRows, addressOnly],
	);

	// Use parent-provided parsed data for preview (e.g. equalized amounts)
	const parsed = displayParsed ?? internalParsed;

	const handleTextChange = useCallback(
		(e: ChangeEvent<HTMLTextAreaElement>) => {
			onChange(e.target.value);
		},
		[onChange],
	);

	const handleFileUpload = useCallback(
		(e: ChangeEvent<HTMLInputElement>) => {
			const file = e.target.files?.[0];
			if (!file) return;

			const reader = new FileReader();
			reader.onload = (ev) => {
				const text = ev.target?.result;
				if (typeof text === "string") {
					onChange(text.trim());
				}
			};
			reader.readAsText(file);
			e.target.value = "";
		},
		[onChange],
	);

	const handleClear = useCallback(() => {
		onChange("");
		onManualRowsChange([{ address: "", amount: "" }]);
	}, [onChange, onManualRowsChange]);

	const handleAddRow = useCallback(() => {
		if (manualRows.length >= MAX_RECIPIENTS) return;
		onManualRowsChange([...manualRows, { address: "", amount: "" }]);
	}, [manualRows, onManualRowsChange]);

	const handleRemoveRow = useCallback(
		(index: number) => {
			if (manualRows.length <= 1) return;
			onManualRowsChange(manualRows.filter((_, i) => i !== index));
		},
		[manualRows, onManualRowsChange],
	);

	const handleRowChange = useCallback(
		(index: number, field: "address" | "amount", val: string) => {
			const updated = manualRows.map((row, i) => (i === index ? { ...row, [field]: val } : row));
			onManualRowsChange(updated);
		},
		[manualRows, onManualRowsChange],
	);

	const hasContent =
		inputMode === "paste" ? value.trim().length > 0 : manualRows.some((r) => r.address || r.amount);

	const pasteplaceholder = addressOnly
		? "0x1234...abcd\n0x5678...efgh\n0xabcd...1234"
		: "0x1234...abcd,100\n0x5678...efgh,250.5\n0xabcd...1234,75";

	return (
		<div className="space-y-3">
			<div className="flex items-center justify-between">
				<span id="recipients-label" className="text-sm font-medium text-smoke">
					Recipients
				</span>
				<div className="flex items-center gap-2">
					{hasContent && (
						<Button
							type="button"
							variant="ghost"
							size="sm"
							className="h-7 px-2 text-xs"
							onClick={handleClear}
						>
							<XIcon className="size-3" />
							Clear
						</Button>
					)}
					{inputMode === "paste" && (
						<>
							<Button
								type="button"
								variant="ghost"
								size="sm"
								className="h-7 px-2 text-xs"
								onClick={() => fileInputRef.current?.click()}
							>
								<UploadIcon className="size-3" />
								Upload CSV
							</Button>
							<input
								ref={fileInputRef}
								type="file"
								accept=".csv,.txt"
								className="hidden"
								onChange={handleFileUpload}
							/>
						</>
					)}
				</div>
			</div>

			{/* Mode toggle */}
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
						inputMode === "paste" ? "bg-anvil-gray text-smoke" : "text-smoke-dark hover:text-smoke"
					}`}
					onClick={() => onInputModeChange("paste")}
				>
					Paste / CSV
				</button>
				<button
					type="button"
					role="tab"
					aria-selected={inputMode === "manual"}
					className={`flex-1 rounded px-3 py-1.5 text-xs font-medium transition-colors ${
						inputMode === "manual" ? "bg-anvil-gray text-smoke" : "text-smoke-dark hover:text-smoke"
					}`}
					onClick={() => onInputModeChange("manual")}
				>
					Manual Entry
				</button>
			</div>

			{inputMode === "paste" ? (
				<textarea
					id="recipients-textarea"
					aria-labelledby="recipients-label"
					className="min-h-[120px] w-full rounded-md border border-anvil-gray-light bg-obsidian-black px-3 py-2 font-mono text-sm text-smoke placeholder:text-smoke-dark focus:border-forge-green focus:outline-none focus:ring-1 focus:ring-forge-green"
					placeholder={pasteplaceholder}
					value={value}
					onChange={handleTextChange}
					spellCheck={false}
				/>
			) : (
				<div className="space-y-2">
					{manualRows.map((row, i) => (
						<div key={`row-${i.toString()}`} className="flex items-center gap-2">
							<Input
								aria-label={`Recipient ${i + 1} address`}
								placeholder="0x..."
								value={row.address}
								onChange={(e) => handleRowChange(i, "address", e.target.value)}
								className="flex-[2] font-mono text-sm"
								autoComplete="off"
								spellCheck={false}
							/>
							{!addressOnly && (
								<Input
									aria-label={`Recipient ${i + 1} amount`}
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
								aria-label={`Remove recipient ${i + 1}`}
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
						disabled={manualRows.length >= MAX_RECIPIENTS}
					>
						<PlusIcon className="size-3" />
						Add Recipient
					</Button>
				</div>
			)}

			{/* Show errors from internal parse (validation) */}
			{internalParsed.errors.length > 0 && (
				<div className="space-y-1" role="alert">
					{internalParsed.errors.map((err) => (
						<p key={err} className="text-xs text-ember-red">
							{err}
						</p>
					))}
				</div>
			)}

			{/* Show warnings from internal parse */}
			{internalParsed.warnings.length > 0 && (
				<div className="space-y-1">
					{internalParsed.warnings.map((warn) => (
						<p key={warn} className="text-xs text-molten-amber">
							{warn}
						</p>
					))}
				</div>
			)}

			{/* Preview table — uses displayParsed (equalized) when available */}
			{parsed.recipients.length > 0 &&
				internalParsed.errors.length === 0 &&
				parsed.totalAmount > 0n && (
					<div className="rounded-lg border border-anvil-gray-light bg-obsidian-black/50 p-3">
						<div className="mb-2 flex items-center justify-between text-xs text-smoke-dark">
							<span>Preview ({parsed.recipients.length} recipients)</span>
							<span className="font-mono text-smoke">
								Total: {formatUnits(parsed.totalAmount, TIP20_DECIMALS)} {tokenSymbol ?? "tokens"}
							</span>
						</div>
						<div className="max-h-[200px] overflow-y-auto">
							<table className="w-full text-xs" aria-label="Recipients preview">
								<thead>
									<tr className="border-b border-anvil-gray-light text-smoke-dark">
										<th className="pb-1 text-left font-medium">#</th>
										<th className="pb-1 text-left font-medium">Address</th>
										<th className="pb-1 text-right font-medium">Amount</th>
									</tr>
								</thead>
								<tbody>
									{parsed.recipients.map((r, i) => (
										<tr
											key={r.address + i.toString()}
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
		</div>
	);
}

export { parseLines, parseManualRows };
