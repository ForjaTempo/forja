"use client";

import { DownloadIcon, PlusIcon, TrashIcon, UploadIcon, XIcon } from "lucide-react";
import { type ChangeEvent, useCallback, useMemo, useRef } from "react";
import type { Hex } from "viem";
import { formatUnits, parseUnits } from "viem";
import { TIP20_DECIMALS } from "@/lib/constants";
import { detectDelimiter, downloadCsvTemplate, stripBom } from "@/lib/csv-utils";
import { cn } from "@/lib/utils";

const MAX_RECIPIENTS = 500;
const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;
const AMOUNT_RE = /^\d+(\.\d{1,6})?$/;
const HEADER_RE = /^(address|recipient|wallet|to)[,\t]/i;

const labelCls = "font-mono text-[11px] uppercase tracking-[0.12em] text-text-tertiary";
const inputCls =
	"w-full rounded-xl border border-border-hair bg-bg-field px-4 py-3 text-[15px] text-text-primary placeholder:text-text-tertiary focus:border-gold/60 focus:outline-none transition-colors";
const chipBtnCls =
	"inline-flex items-center gap-1 rounded-lg border border-border-hair bg-bg-field px-2.5 py-1 text-[11px] font-medium text-text-secondary transition-colors hover:border-border-subtle hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-50";

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

function parseLines(text: string, addressOnly = false): ParseResult {
	const cleaned = stripBom(text);
	const delimiter = detectDelimiter(cleaned);
	const delimiterRe = delimiter === "\t" ? /\t+/ : new RegExp(`[${delimiter}]+`);

	const rawLines = cleaned
		.split("\n")
		.map((l) => l.trim())
		.filter((l) => l.length > 0);

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

		const parts = line.split(delimiterRe).map((p) => p.trim());
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
					onChange(stripBom(text).trim());
				}
			};
			reader.readAsText(file);
			e.target.value = "";
		},
		[onChange],
	);

	const handleDownloadTemplate = useCallback(() => {
		if (addressOnly) {
			downloadCsvTemplate(
				"recipients-template.csv",
				["address"],
				[
					["0x1234567890abcdef1234567890abcdef12345678"],
					["0xabcdefabcdefabcdefabcdefabcdefabcdefabcd"],
				],
			);
		} else {
			downloadCsvTemplate(
				"recipients-template.csv",
				["address", "amount"],
				[
					["0x1234567890abcdef1234567890abcdef12345678", "100"],
					["0xabcdefabcdefabcdefabcdefabcdefabcdefabcd", "250.5"],
				],
			);
		}
	}, [addressOnly]);

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
		? "0x1234…abcd\n0x5678…efgh\n0xabcd…1234"
		: "0x1234…abcd,100\n0x5678…efgh,250.5\n0xabcd…1234,75";

	return (
		<div className="space-y-3">
			<div className="flex items-center justify-between gap-2">
				<span id="recipients-label" className={labelCls}>
					Recipients
				</span>
				<div className="flex flex-wrap items-center gap-1.5">
					{hasContent && (
						<button type="button" className={chipBtnCls} onClick={handleClear}>
							<XIcon className="size-3" />
							Clear
						</button>
					)}
					{inputMode === "paste" && (
						<>
							<button type="button" className={chipBtnCls} onClick={handleDownloadTemplate}>
								<DownloadIcon className="size-3" />
								Template
							</button>
							<button
								type="button"
								className={chipBtnCls}
								onClick={() => fileInputRef.current?.click()}
							>
								<UploadIcon className="size-3" />
								Upload CSV
							</button>
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
					onClick={() => onInputModeChange("paste")}
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
					onClick={() => onInputModeChange("manual")}
				>
					Manual entry
				</button>
			</div>

			{inputMode === "paste" ? (
				<textarea
					id="recipients-textarea"
					aria-labelledby="recipients-label"
					className="min-h-[140px] w-full rounded-xl border border-border-hair bg-bg-field px-4 py-3 font-mono text-[13px] text-text-primary placeholder:text-text-tertiary focus:border-gold/60 focus:outline-none transition-colors"
					placeholder={pasteplaceholder}
					value={value}
					onChange={handleTextChange}
					spellCheck={false}
				/>
			) : (
				<div className="space-y-2">
					{manualRows.map((row, i) => (
						<div key={`row-${i.toString()}`} className="flex items-center gap-2">
							<input
								type="text"
								aria-label={`Recipient ${i + 1} address`}
								placeholder="0x…"
								value={row.address}
								onChange={(e) => handleRowChange(i, "address", e.target.value)}
								className={cn(inputCls, "flex-[2] py-2.5 font-mono text-[13px]")}
								autoComplete="off"
								spellCheck={false}
							/>
							{!addressOnly && (
								<input
									type="text"
									aria-label={`Recipient ${i + 1} amount`}
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
								aria-label={`Remove recipient ${i + 1}`}
							>
								<TrashIcon className="size-3.5" />
							</button>
						</div>
					))}
					<button
						type="button"
						className="inline-flex items-center gap-1.5 rounded-lg border border-border-hair bg-bg-field px-3 py-2 text-[12px] font-medium text-text-secondary transition-colors hover:border-border-subtle hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40"
						onClick={handleAddRow}
						disabled={manualRows.length >= MAX_RECIPIENTS}
					>
						<PlusIcon className="size-3" />
						Add recipient
					</button>
				</div>
			)}

			{internalParsed.errors.length > 0 && (
				<div className="space-y-1" role="alert">
					{internalParsed.errors.map((err) => (
						<p key={err} className="text-[12px] text-red">
							{err}
						</p>
					))}
				</div>
			)}

			{internalParsed.warnings.length > 0 && (
				<div className="space-y-1">
					{internalParsed.warnings.map((warn) => (
						<p key={warn} className="text-[12px] text-gold">
							{warn}
						</p>
					))}
				</div>
			)}

			{parsed.recipients.length > 0 &&
				internalParsed.errors.length === 0 &&
				parsed.totalAmount > 0n && (
					<div className="rounded-xl border border-border-hair bg-bg-field/60 p-3.5">
						<div className="mb-2.5 flex items-center justify-between text-[12px]">
							<span className="text-text-tertiary">
								Preview · {parsed.recipients.length} recipients
							</span>
							<span className="font-mono text-text-primary">
								Total {formatUnits(parsed.totalAmount, TIP20_DECIMALS)} {tokenSymbol ?? "tokens"}
							</span>
						</div>
						<div className="max-h-[200px] overflow-y-auto">
							<table className="w-full text-[12px]" aria-label="Recipients preview">
								<thead>
									<tr className="font-mono text-[10px] text-text-tertiary uppercase tracking-[0.12em]">
										<th className="pb-1.5 text-left font-medium">#</th>
										<th className="pb-1.5 text-left font-medium">Address</th>
										<th className="pb-1.5 text-right font-medium">Amount</th>
									</tr>
								</thead>
								<tbody>
									{parsed.recipients.map((r, i) => (
										<tr key={r.address + i.toString()} className="border-border-hair border-t">
											<td className="py-1.5 text-text-tertiary">{i + 1}</td>
											<td className="py-1.5 font-mono text-text-secondary">
												{r.address.slice(0, 8)}…{r.address.slice(-6)}
											</td>
											<td className="py-1.5 text-right font-mono text-text-primary">{r.amount}</td>
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
