"use client";

import { ChevronDownIcon, ChevronUpIcon, TagIcon } from "lucide-react";
import { type ChangeEvent, type FormEvent, useCallback, useRef, useState } from "react";
import { formatUnits, parseUnits } from "viem";
import { useAccount } from "wagmi";
import { ImageUpload } from "@/components/ui/image-upload";
import { TransactionStatus } from "@/components/ui/transaction-status";
import { useCreateFee } from "@/hooks/use-create-fee";
import { useCreateToken } from "@/hooks/use-create-token";
import { useTransactionEffects } from "@/hooks/use-transaction-effects";
import { useUsdcApproval } from "@/hooks/use-usdc-approval";
import { useUsdcBalance } from "@/hooks/use-usdc-balance";
import { useWalletAuth } from "@/hooks/use-wallet-auth";
import { TIP20_DECIMALS } from "@/lib/constants";
import { tokenFactoryConfig } from "@/lib/contracts";
import { deriveTxState, formatErrorMessage } from "@/lib/format";
import { LAUNCH_TAGS, MAX_LAUNCH_TAGS } from "@/lib/launch-tags";
import { cn } from "@/lib/utils";
import { CreateButton } from "./create-button";

const NAME_MAX = 50;
const SYMBOL_MAX = 10;
/** Digits with optional decimal point, max 6 decimal places (TIP-20 precision) */
const VALID_SUPPLY = /^\d+(\.\d{1,6})?$/;

const labelCls = "font-mono text-[11px] uppercase tracking-[0.12em] text-text-tertiary";
const inputCls =
	"w-full rounded-xl border border-border-hair bg-bg-field px-4 py-3 text-[15px] text-text-primary placeholder:text-text-tertiary focus:border-gold/60 focus:outline-none transition-colors";

interface TokenFormProps {
	onSuccess?: (data: {
		name: string;
		symbol: string;
		txHash: string;
		tokenAddress: string;
		logoUrl?: string;
		tags?: string[];
	}) => void;
}

export function TokenForm({ onSuccess }: TokenFormProps) {
	const { isConnected } = useAccount();
	const { ensureAuth } = useWalletAuth();
	const [name, setName] = useState("");
	const [symbol, setSymbol] = useState("");
	const [initialSupply, setInitialSupply] = useState("");
	const [logoUrl, setLogoUrl] = useState("");
	const [tags, setTags] = useState<string[]>([]);
	const [tagsOpen, setTagsOpen] = useState(false);
	const successFired = useRef(false);
	const [txDialogOpen, setTxDialogOpen] = useState(false);

	const toggleTag = useCallback((tag: string) => {
		setTags((prev) => {
			if (prev.includes(tag)) return prev.filter((t) => t !== tag);
			if (prev.length >= MAX_LAUNCH_TAGS) return prev;
			return [...prev, tag];
		});
	}, []);

	const { fee, formatted: feeFormatted } = useCreateFee();
	const { balance, formatted: balanceFormatted } = useUsdcBalance();

	const feeAmount = fee ?? parseUnits(String(feeFormatted), TIP20_DECIMALS);

	const { needsApproval, isAllowanceLoading, approve, isApproving, isApprovalConfirming } =
		useUsdcApproval({
			spender: tokenFactoryConfig.address,
			amount: feeAmount,
		});

	const { createToken, isCreating, isConfirming, isSuccess, txHash, tokenAddress, error, reset } =
		useCreateToken();

	const insufficientBalance = balance !== undefined && balance < feeAmount;

	const nameError = name.length > NAME_MAX ? `Max ${NAME_MAX} characters` : "";
	const symbolError = symbol.length > SYMBOL_MAX ? `Max ${SYMBOL_MAX} characters` : "";
	const supplyError =
		initialSupply !== "" && !VALID_SUPPLY.test(initialSupply)
			? "Must be a plain number with max 6 decimals (e.g. 1000000 or 1.5)"
			: "";
	const formValid =
		name.trim() !== "" && symbol.trim() !== "" && !nameError && !symbolError && !supplyError;

	const handleSymbolChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
		setSymbol(e.target.value.toUpperCase());
	}, []);

	const handleCreate = useCallback(() => {
		if (!formValid) return;
		successFired.current = false;
		setTxDialogOpen(true);
		createToken(name.trim(), symbol.trim(), initialSupply || "0");
	}, [formValid, name, symbol, initialSupply, createToken]);

	const handleSubmit = useCallback(
		(e: FormEvent) => {
			e.preventDefault();
			handleCreate();
		},
		[handleCreate],
	);

	const txState = deriveTxState(isCreating, isConfirming, isSuccess, error);

	useTransactionEffects({
		txHash,
		isConfirming,
		isSuccess,
		error,
		onSuccess: () => {
			if (txHash && tokenAddress) {
				successFired.current = true;
				setTxDialogOpen(false);
				onSuccess?.({
					name: name.trim(),
					symbol: symbol.trim(),
					txHash,
					tokenAddress,
					logoUrl: logoUrl || undefined,
					tags: tags.length > 0 ? tags : undefined,
				});
			}
		},
	});

	const handleRetry = useCallback(() => {
		reset();
		setTxDialogOpen(false);
		setTimeout(() => handleCreate(), 0);
	}, [reset, handleCreate]);

	const handleTxDialogClose = useCallback(
		(open: boolean) => {
			if (!open) {
				setTxDialogOpen(false);
				if (error) reset();
			}
		},
		[error, reset],
	);

	const previewSupply =
		initialSupply && VALID_SUPPLY.test(initialSupply)
			? formatUnits(parseUnits(initialSupply, TIP20_DECIMALS), TIP20_DECIMALS)
			: null;

	return (
		<>
			<form onSubmit={handleSubmit} className="space-y-6">
				<div className="space-y-2">
					<label htmlFor="token-name" className={labelCls}>
						Token name
					</label>
					<input
						id="token-name"
						type="text"
						placeholder="e.g. My Token"
						value={name}
						onChange={(e) => setName(e.target.value)}
						maxLength={NAME_MAX + 10}
						autoComplete="off"
						className={inputCls}
					/>
					{nameError && <p className="text-[12px] text-red">{nameError}</p>}
				</div>

				<div className="space-y-2">
					<label htmlFor="token-symbol" className={labelCls}>
						Token symbol
					</label>
					<input
						id="token-symbol"
						type="text"
						placeholder="e.g. MTK"
						value={symbol}
						onChange={handleSymbolChange}
						maxLength={SYMBOL_MAX + 5}
						autoComplete="off"
						className={cn(inputCls, "font-mono tracking-[0.1em]")}
					/>
					{symbolError && <p className="text-[12px] text-red">{symbolError}</p>}
				</div>

				<div className="space-y-2">
					<span className={labelCls}>
						Token logo <span className="text-text-tertiary normal-case">· optional</span>
					</span>
					<ImageUpload
						type="token"
						value={logoUrl || undefined}
						onChange={(url) => setLogoUrl(url ?? "")}
						ensureAuth={ensureAuth}
					/>
				</div>

				<div className="space-y-2">
					<label htmlFor="token-supply" className={labelCls}>
						Initial supply
					</label>
					<input
						id="token-supply"
						type="text"
						inputMode="numeric"
						placeholder="0"
						value={initialSupply}
						onChange={(e) => setInitialSupply(e.target.value)}
						autoComplete="off"
						className={cn(inputCls, "font-mono")}
					/>
					<p className="text-[12px] text-text-tertiary">
						Leave as 0 to create a token without an initial mint.
					</p>
					{supplyError && <p className="text-[12px] text-red">{supplyError}</p>}
				</div>

				<div className="space-y-2">
					<button
						type="button"
						onClick={() => setTagsOpen((v) => !v)}
						className="flex w-full items-center justify-between rounded-xl border border-border-hair bg-bg-field px-4 py-3 text-[13.5px] text-text-secondary transition-colors hover:border-border-subtle hover:text-text-primary"
					>
						<span className="flex items-center gap-2">
							<TagIcon className="size-4 text-text-tertiary" />
							<span
								className={cn(
									labelCls,
									"normal-case tracking-[0.02em] text-[13.5px] text-text-secondary",
								)}
							>
								Tags
							</span>
							<span className="text-[12px] text-text-tertiary">
								{tags.length > 0 ? `${tags.length} of ${MAX_LAUNCH_TAGS}` : "optional"}
							</span>
						</span>
						{tagsOpen ? (
							<ChevronUpIcon className="size-4" />
						) : (
							<ChevronDownIcon className="size-4" />
						)}
					</button>
					{tagsOpen && (
						<div className="space-y-3 rounded-xl border border-border-hair bg-bg-field/60 p-4">
							<p className="text-[12px] text-text-tertiary">
								Help people discover your token. Pick up to {MAX_LAUNCH_TAGS}.
							</p>
							<div className="flex flex-wrap gap-2">
								{LAUNCH_TAGS.map((tag) => {
									const active = tags.includes(tag);
									const disabled = !active && tags.length >= MAX_LAUNCH_TAGS;
									return (
										<button
											key={tag}
											type="button"
											disabled={disabled}
											onClick={() => toggleTag(tag)}
											className={cn(
												"rounded-full border px-3 py-1 text-[12px] font-medium transition-colors",
												active
													? "border-gold/40 bg-gold/10 text-gold"
													: "border-border-hair bg-bg-elevated text-text-secondary hover:border-border-subtle hover:text-text-primary",
												disabled && "cursor-not-allowed opacity-40",
											)}
										>
											{tag}
										</button>
									);
								})}
							</div>
						</div>
					)}
				</div>

				{(name.trim() || symbol.trim()) && (
					<div className="rounded-xl border border-border-hair bg-bg-field/40 p-4">
						<div className={cn(labelCls, "mb-3")}>Preview</div>
						<dl className="space-y-1.5 text-[13.5px]">
							<div className="flex justify-between gap-4">
								<dt className="text-text-tertiary">Name</dt>
								<dd className="text-text-primary">{name.trim() || "—"}</dd>
							</div>
							<div className="flex justify-between gap-4">
								<dt className="text-text-tertiary">Symbol</dt>
								<dd className="font-mono text-text-primary">{symbol.trim() || "—"}</dd>
							</div>
							<div className="flex justify-between gap-4">
								<dt className="text-text-tertiary">Supply</dt>
								<dd className="font-mono text-text-primary">
									{previewSupply ?? "0 (no initial mint)"}
								</dd>
							</div>
						</dl>
					</div>
				)}

				<div className="space-y-2 border-border-hair border-t pt-5">
					<div className="flex items-center justify-between text-[13px]">
						<span className={labelCls}>Creation fee</span>
						<span className="font-mono text-text-primary">{feeFormatted} USDC</span>
					</div>
					{isConnected && (
						<div className="flex items-center justify-between text-[13px]">
							<span className={labelCls}>Your balance</span>
							<span className="font-mono text-text-secondary">
								{balanceFormatted !== undefined
									? `${Number.parseFloat(balanceFormatted).toLocaleString("en-US", { maximumFractionDigits: 2 })} USDC`
									: "—"}
							</span>
						</div>
					)}
					{insufficientBalance && (
						<p className="text-[12px] text-red">
							Insufficient USDC balance to cover the creation fee.
						</p>
					)}
				</div>

				<CreateButton
					needsApproval={needsApproval}
					isAllowanceLoading={isAllowanceLoading}
					insufficientBalance={insufficientBalance}
					isApproving={isApproving}
					isApprovalConfirming={isApprovalConfirming}
					isCreating={isCreating}
					isConfirming={isConfirming}
					disabled={!formValid}
					onApprove={approve}
					onCreate={handleCreate}
				/>
			</form>

			<TransactionStatus
				open={txDialogOpen && txState !== "idle"}
				onOpenChange={handleTxDialogClose}
				state={txState}
				txHash={txHash}
				title="Creating Token"
				onRetry={error ? handleRetry : undefined}
				error={error ? formatErrorMessage(error, 120) : undefined}
			/>
		</>
	);
}
