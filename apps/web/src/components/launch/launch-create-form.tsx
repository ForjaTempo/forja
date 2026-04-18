"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useQuery } from "@tanstack/react-query";
import {
	ArrowLeftIcon,
	CheckIcon,
	ChevronDownIcon,
	ChevronUpIcon,
	CopyIcon,
	GlobeIcon,
	InfoIcon,
	MessageCircleIcon,
	RocketIcon,
	SendIcon,
	XIcon as TwitterIcon,
	WalletIcon,
} from "lucide-react";
import Link from "next/link";
import { type ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
import { parseUnits } from "viem";
import { useAccount } from "wagmi";
import { getLaunchDbId, saveLaunchMetadata } from "@/actions/launches";
import { triggerConfetti } from "@/components/ui/confetti";
import { FilterChip } from "@/components/ui/filter-chip";
import { ImageUpload } from "@/components/ui/image-upload";
import { TransactionStatus } from "@/components/ui/transaction-status";
import { useCreateLaunch } from "@/hooks/use-create-launch";
import { useTransactionEffects } from "@/hooks/use-transaction-effects";
import { useUsdcApproval } from "@/hooks/use-usdc-approval";
import { useUsdcBalance } from "@/hooks/use-usdc-balance";
import { useWalletAuth } from "@/hooks/use-wallet-auth";
import { FEES, FORJA_LAUNCHPAD_ADDRESS, TIP20_DECIMALS } from "@/lib/constants";
import { deriveTxState, formatErrorMessage } from "@/lib/format";
import { LAUNCH_TAGS, MAX_LAUNCH_TAGS } from "@/lib/launch-tags";
import { cn } from "@/lib/utils";

type Step = 1 | 2 | 3;

const PINK_PURPLE_GRADIENT = "linear-gradient(135deg, #f472b6, #a78bfa)";

const labelCls = "block font-mono text-[11px] uppercase tracking-[0.12em] text-text-tertiary";
const inputCls =
	"flex h-10 w-full rounded-xl border border-border-hair bg-bg-field px-3.5 py-2 text-sm text-text-primary placeholder:text-text-tertiary/60 transition-colors focus:border-gold/60 focus:outline-none";

export function LaunchCreateForm() {
	const { isConnected } = useAccount();
	const { ensureAuth } = useWalletAuth();

	const [step, setStep] = useState<Step>(1);
	const [name, setName] = useState("");
	const [symbol, setSymbol] = useState("");
	const [description, setDescription] = useState("");
	const [imageUri, setImageUri] = useState("");

	// Social + tags (persisted in component state across back/forward)
	const [socialOpen, setSocialOpen] = useState(false);
	const [website, setWebsite] = useState("");
	const [twitterHandle, setTwitterHandle] = useState("");
	const [telegramHandle, setTelegramHandle] = useState("");
	const [discordHandle, setDiscordHandle] = useState("");
	const [tags, setTags] = useState<string[]>([]);

	const createFeeRaw = parseUnits(FEES.launchCreate.toString(), TIP20_DECIMALS);
	const { balance: usdcBalance } = useUsdcBalance();
	const {
		needsApproval,
		isAllowanceLoading,
		approve,
		isApproving,
		isApprovalConfirming,
		isApprovalConfirmed,
		approveError,
		resetApproval,
	} = useUsdcApproval({ spender: FORJA_LAUNCHPAD_ADDRESS, amount: createFeeRaw });

	const {
		createLaunch,
		isCreating,
		isConfirming,
		isSuccess,
		txHash,
		launchId,
		tokenAddress,
		error: createError,
		reset: resetCreate,
	} = useCreateLaunch();

	const [txDialogOpen, setTxDialogOpen] = useState(false);

	const hasEnoughBalance = usdcBalance !== undefined && usdcBalance >= createFeeRaw;
	const nameValid = name.trim().length >= 1 && name.trim().length <= 50;
	const symbolValid = symbol.trim().length >= 1 && symbol.trim().length <= 10;
	const descValid = description.length <= 500;
	const identityValid = nameValid && symbolValid && descValid;

	const txState = deriveTxState(isCreating, isConfirming, isSuccess, createError);

	useTransactionEffects({
		txHash,
		isConfirming,
		isSuccess,
		error: createError,
		showConfirmedToast: true,
	});

	const toggleTag = useCallback((tag: string) => {
		setTags((prev) => {
			if (prev.includes(tag)) return prev.filter((t) => t !== tag);
			if (prev.length >= MAX_LAUNCH_TAGS) return prev;
			return [...prev, tag];
		});
	}, []);

	const handleCreate = useCallback(() => {
		if (!identityValid) return;
		setTxDialogOpen(true);
		createLaunch(name.trim(), symbol.trim().toUpperCase(), description.trim(), imageUri.trim());
	}, [createLaunch, name, symbol, description, imageUri, identityValid]);

	const handleTxDialogClose = useCallback(
		(open: boolean) => {
			if (!open) {
				setTxDialogOpen(false);
				if (createError) resetCreate();
			}
		},
		[createError, resetCreate],
	);

	const handleReset = useCallback(() => {
		setStep(1);
		setName("");
		setSymbol("");
		setDescription("");
		setImageUri("");
		setWebsite("");
		setTwitterHandle("");
		setTelegramHandle("");
		setDiscordHandle("");
		setTags([]);
		setSocialOpen(false);
		resetCreate();
		resetApproval();
	}, [resetCreate, resetApproval]);

	if (!isConnected) {
		return (
			<div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-center">
				<WalletIcon className="size-12 text-text-tertiary" />
				<h2 className="font-display text-2xl font-normal text-text-primary">Connect your wallet</h2>
				<p className="text-sm text-text-secondary">Connect your wallet to create a launch.</p>
				<ConnectButton />
			</div>
		);
	}

	if (isSuccess) {
		return (
			<LaunchSuccessCard
				onChainLaunchId={launchId}
				tokenAddress={tokenAddress}
				symbol={symbol}
				pendingMetadata={{
					website,
					twitterHandle,
					telegramHandle,
					discordHandle,
					tags,
				}}
				ensureAuth={ensureAuth}
				onReset={handleReset}
			/>
		);
	}

	return (
		<div className="space-y-7">
			<Stepper step={step} />

			{step === 1 && (
				<section className="space-y-5">
					<div className="font-display text-[22px] leading-[1.2] tracking-[-0.02em] text-text-primary">
						Token identity
					</div>

					<div className="space-y-1.5">
						<label htmlFor="name" className={labelCls}>
							Name
						</label>
						<input
							id="name"
							placeholder="My Token"
							value={name}
							onChange={(e) => setName(e.target.value)}
							maxLength={50}
							className={inputCls}
						/>
						<p className="font-mono text-[10px] text-text-tertiary">{name.length}/50 characters</p>
					</div>

					<div className="space-y-1.5">
						<label htmlFor="symbol" className={labelCls}>
							Symbol
						</label>
						<input
							id="symbol"
							placeholder="MTK"
							value={symbol}
							onChange={(e) => setSymbol(e.target.value.toUpperCase())}
							maxLength={10}
							className={inputCls}
						/>
						<p className="font-mono text-[10px] text-text-tertiary">
							{symbol.length}/10 characters
						</p>
					</div>

					<div className="space-y-1.5">
						<label htmlFor="description" className={labelCls}>
							Description <span className="normal-case tracking-normal">(optional)</span>
						</label>
						<textarea
							id="description"
							placeholder="Describe your token..."
							value={description}
							onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
							maxLength={500}
							rows={3}
							className="flex w-full rounded-xl border border-border-hair bg-bg-field px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary/60 transition-colors focus:border-gold/60 focus:outline-none"
						/>
						<p className="font-mono text-[10px] text-text-tertiary">
							{description.length}/500 characters
						</p>
					</div>

					<div className="space-y-1.5">
						<span className={labelCls}>
							Image <span className="normal-case tracking-normal">(optional)</span>
						</span>
						<ImageUpload
							type="launch"
							value={imageUri || undefined}
							onChange={(url) => setImageUri(url ?? "")}
							ensureAuth={ensureAuth}
						/>
					</div>

					{/* Social links collapsible */}
					<button
						type="button"
						onClick={() => setSocialOpen((v) => !v)}
						className="flex w-full items-center justify-between rounded-xl border border-border-hair bg-bg-field px-4 py-3 text-sm text-text-secondary transition-colors hover:border-border-strong hover:text-text-primary"
					>
						<span className="flex items-center gap-2">
							<GlobeIcon className="size-4" />
							<span className="font-mono text-[11px] uppercase tracking-[0.12em]">
								Social links & tags
							</span>
							<span className="text-xs text-text-tertiary">(optional)</span>
						</span>
						{socialOpen ? (
							<ChevronUpIcon className="size-4" />
						) : (
							<ChevronDownIcon className="size-4" />
						)}
					</button>
					{socialOpen && (
						<div className="space-y-4 rounded-xl border border-border-hair bg-bg-card/50 p-5">
							<p className="text-xs leading-[1.6] text-text-tertiary">
								Social links increase trust and visibility. You can add these later too.
							</p>

							<SocialField
								id="website"
								label="Website"
								placeholder="https://example.com"
								value={website}
								onChange={setWebsite}
								icon={<GlobeIcon className="size-4" />}
							/>
							<SocialField
								id="twitter"
								label="Twitter / X"
								placeholder="yourhandle (without @)"
								value={twitterHandle}
								onChange={setTwitterHandle}
								icon={<TwitterIcon className="size-4" />}
							/>
							<SocialField
								id="telegram"
								label="Telegram"
								placeholder="yourchannel"
								value={telegramHandle}
								onChange={setTelegramHandle}
								icon={<SendIcon className="size-4" />}
							/>
							<SocialField
								id="discord"
								label="Discord"
								placeholder="invite link or handle"
								value={discordHandle}
								onChange={setDiscordHandle}
								icon={<MessageCircleIcon className="size-4" />}
							/>

							<div className="space-y-2">
								<div className="flex items-center justify-between">
									<span className={labelCls}>Tags</span>
									<span className="font-mono text-[10px] text-text-tertiary">
										{tags.length}/{MAX_LAUNCH_TAGS} selected
									</span>
								</div>
								<div className="flex flex-wrap gap-2">
									{LAUNCH_TAGS.map((tag) => {
										const active = tags.includes(tag);
										const disabled = !active && tags.length >= MAX_LAUNCH_TAGS;
										return (
											<FilterChip
												key={tag}
												active={active}
												onClick={disabled ? undefined : () => toggleTag(tag)}
												className={disabled ? "cursor-not-allowed opacity-50" : ""}
											>
												{tag}
											</FilterChip>
										);
									})}
								</div>
							</div>
						</div>
					)}

					<PrimaryButton disabled={!identityValid} onClick={() => setStep(2)}>
						Continue to parameters
					</PrimaryButton>
				</section>
			)}

			{step === 2 && (
				<section className="space-y-5">
					<button
						type="button"
						onClick={() => setStep(1)}
						className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-text-tertiary transition-colors hover:text-text-primary"
					>
						<ArrowLeftIcon className="size-3.5" />
						Back to identity
					</button>

					<div className="font-display text-[22px] leading-[1.2] tracking-[-0.02em] text-text-primary">
						Launch parameters
					</div>
					<p className="text-xs text-text-tertiary">
						These are protocol parameters. They are fixed for all launches.
					</p>

					{/* Supply breakdown */}
					<div className="space-y-2 rounded-xl border border-border-hair bg-bg-field p-4">
						<div className="flex items-center justify-between text-sm">
							<span className="font-mono text-[11px] uppercase tracking-[0.12em] text-text-tertiary">
								Total supply
							</span>
							<span className="font-mono text-text-primary">1,000,000,000</span>
						</div>
						<div className="h-2 overflow-hidden rounded-full bg-bg-page">
							<div className="flex h-full">
								<div
									className="h-full"
									style={{ width: "80%", background: PINK_PURPLE_GRADIENT }}
								/>
								<div className="h-full bg-green" style={{ width: "20%" }} />
							</div>
						</div>
						<div className="flex justify-between font-mono text-[10px] uppercase tracking-[0.1em] text-text-tertiary">
							<span className="inline-flex items-center gap-1.5">
								<span
									className="inline-block size-2 rounded-full"
									style={{ background: "#f472b6" }}
								/>
								800M curve (80%)
							</span>
							<span className="inline-flex items-center gap-1.5">
								<span className="inline-block size-2 rounded-full bg-green" />
								200M LP (20%)
							</span>
						</div>
					</div>

					{/* Fee stack */}
					<div className="divide-y divide-border-hair rounded-xl border border-border-hair bg-bg-field">
						<ParamRow
							label="Creation fee"
							value={`Est. ${FEES.launchCreate} USDC`}
							tooltip="One-time fee paid to create the launch."
						/>
						<ParamRow
							label="Trading fee"
							value="1% per trade"
							tooltip="0.5% goes to you (creator), 0.5% to FORJA protocol."
						/>
						<ParamRow
							label="Graduation threshold"
							value="$69,000 USDC raised"
							tooltip="When raised reaches $69K, liquidity migrates to Uniswap v4 and trading continues there."
						/>
					</div>

					{/* Anti-snipe */}
					<div className="divide-y divide-border-hair rounded-xl border border-border-hair bg-bg-field">
						<ParamRow
							label="Max single buy"
							value="5,000 USDC"
							tooltip="Anti-snipe cap: no one can buy more than this in a single transaction."
						/>
						<ParamRow
							label="Min single buy"
							value="1 USDC"
							tooltip="Minimum trade size to prevent dust/spam."
						/>
						<ParamRow
							label="Launch timeout"
							value="30 days"
							tooltip="If not graduated within 30 days, the launch enters failed state and buyers can exit."
						/>
					</div>

					<PrimaryButton onClick={() => setStep(3)}>Continue to review</PrimaryButton>
				</section>
			)}

			{step === 3 && (
				<section className="space-y-5">
					<button
						type="button"
						onClick={() => setStep(2)}
						className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-text-tertiary transition-colors hover:text-text-primary"
					>
						<ArrowLeftIcon className="size-3.5" />
						Back to parameters
					</button>

					<div className="font-display text-[22px] leading-[1.2] tracking-[-0.02em] text-text-primary">
						Review & launch
					</div>

					{/* Preview card — looks like real launch card */}
					<div className="rounded-xl border border-border-hair bg-bg-field p-5">
						<div className="mb-4 flex items-center gap-3">
							{imageUri ? (
								// biome-ignore lint/performance/noImgElement: local preview
								<img src={imageUri} alt={symbol} className="size-12 rounded-xl object-cover" />
							) : (
								<div
									className="flex size-12 items-center justify-center rounded-xl font-display text-base font-semibold"
									style={{
										background: PINK_PURPLE_GRADIENT,
										color: "#1a0620",
									}}
								>
									{symbol.slice(0, 2).toUpperCase() || <RocketIcon className="size-5" />}
								</div>
							)}
							<div className="min-w-0">
								<p className="truncate font-display text-lg text-text-primary">{name}</p>
								<p className="font-mono text-xs text-text-tertiary">${symbol.toUpperCase()}</p>
							</div>
						</div>

						{description && (
							<p className="mb-3 text-sm leading-[1.6] text-text-secondary">{description}</p>
						)}

						{tags.length > 0 && (
							<div className="mb-3 flex flex-wrap gap-1.5">
								{tags.map((tag) => (
									<span
										key={tag}
										className="inline-flex items-center rounded-full bg-bg-elevated px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-text-secondary"
									>
										{tag}
									</span>
								))}
							</div>
						)}

						{(website || twitterHandle || telegramHandle || discordHandle) && (
							<div className="flex flex-wrap gap-2 font-mono text-[10px] uppercase tracking-[0.1em] text-text-tertiary">
								{website && (
									<span className="inline-flex items-center gap-1">
										<GlobeIcon className="size-3" /> website
									</span>
								)}
								{twitterHandle && (
									<span className="inline-flex items-center gap-1">
										<TwitterIcon className="size-3" /> @{twitterHandle}
									</span>
								)}
								{telegramHandle && (
									<span className="inline-flex items-center gap-1">
										<SendIcon className="size-3" /> telegram
									</span>
								)}
								{discordHandle && (
									<span className="inline-flex items-center gap-1">
										<MessageCircleIcon className="size-3" /> discord
									</span>
								)}
							</div>
						)}
					</div>

					<div className="divide-y divide-border-hair rounded-xl border border-border-hair bg-bg-field">
						<Row label="Total supply" value="1,000,000,000" />
						<Row label="Initial price" value="~$0.000028" />
						<Row label="Graduation at" value="$69,000 raised" />
						<Row label="Trading fee" value="1% (0.5% to you)" />
						<Row label="Creation fee" value={`Est. ${FEES.launchCreate} USDC`} />
					</div>

					{!hasEnoughBalance && (
						<p className="text-center text-sm text-red">
							Insufficient USDC balance for creation fee
						</p>
					)}

					{approveError && (
						<p className="text-center text-sm text-red">{formatErrorMessage(approveError)}</p>
					)}
					{createError && (
						<p className="text-center text-sm text-red">{formatErrorMessage(createError)}</p>
					)}

					{needsApproval && !isApprovalConfirmed ? (
						<PrimaryButton
							disabled={
								!hasEnoughBalance || isApproving || isApprovalConfirming || isAllowanceLoading
							}
							onClick={approve}
						>
							{isApproving
								? "Approving..."
								: isApprovalConfirming
									? "Confirming..."
									: "Approve USDC"}
						</PrimaryButton>
					) : (
						<PrimaryButton
							disabled={!hasEnoughBalance || isCreating || isConfirming}
							onClick={handleCreate}
						>
							<RocketIcon className="mr-2 size-4" />
							{isCreating ? "Creating..." : isConfirming ? "Confirming..." : "Create launch"}
						</PrimaryButton>
					)}

					<TransactionStatus
						open={txDialogOpen && txState !== "idle"}
						onOpenChange={handleTxDialogClose}
						state={txState}
						txHash={txHash}
						title="Create launch"
					/>
				</section>
			)}
		</div>
	);
}

function PrimaryButton({
	children,
	onClick,
	disabled,
}: {
	children: React.ReactNode;
	onClick: () => void;
	disabled?: boolean;
}) {
	return (
		<button
			type="button"
			disabled={disabled}
			onClick={onClick}
			className="inline-flex w-full items-center justify-center rounded-xl px-[22px] py-3.5 font-semibold text-sm transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
			style={{
				background: PINK_PURPLE_GRADIENT,
				color: "#1a0620",
				boxShadow: "0 4px 24px rgba(244,114,182,0.3)",
			}}
		>
			{children}
		</button>
	);
}

function Stepper({ step }: { step: Step }) {
	const labels = ["Identity", "Parameters", "Review"];
	return (
		<div className="flex items-center gap-2">
			{labels.map((label, i) => {
				const n = (i + 1) as Step;
				const isActive = step === n;
				const isDone = step > n;
				return (
					<div key={label} className="flex flex-1 items-center gap-2">
						<div
							className={cn(
								"flex size-8 shrink-0 items-center justify-center rounded-full border font-mono text-xs font-semibold transition-colors",
								isDone && "border-transparent text-[#1a0620]",
								isActive && "text-[#1a0620]",
								!isActive && !isDone && "border-border-hair text-text-tertiary",
							)}
							style={
								isActive || isDone
									? {
											background: PINK_PURPLE_GRADIENT,
											borderColor: "transparent",
										}
									: undefined
							}
						>
							{isDone ? <CheckIcon className="size-4" /> : n}
						</div>
						<span
							className={cn(
								"hidden font-mono text-[11px] uppercase tracking-[0.12em] sm:inline",
								isActive ? "text-text-primary" : "text-text-tertiary",
							)}
						>
							{label}
						</span>
						{i < labels.length - 1 && (
							<div
								className="h-px flex-1 transition-colors"
								style={{
									background: isDone ? PINK_PURPLE_GRADIENT : "var(--color-border-hair)",
								}}
							/>
						)}
					</div>
				);
			})}
		</div>
	);
}

function SocialField({
	id,
	label,
	placeholder,
	value,
	onChange,
	icon,
}: {
	id: string;
	label: string;
	placeholder: string;
	value: string;
	onChange: (v: string) => void;
	icon: React.ReactNode;
}) {
	return (
		<div className="space-y-1.5">
			<label
				htmlFor={id}
				className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-text-tertiary"
			>
				{icon}
				{label}
			</label>
			<input
				id={id}
				placeholder={placeholder}
				value={value}
				onChange={(e) => onChange(e.target.value)}
				maxLength={200}
				className={inputCls}
			/>
		</div>
	);
}

function ParamRow({ label, value, tooltip }: { label: string; value: string; tooltip: string }) {
	return (
		<div className="flex items-start justify-between gap-4 px-4 py-3">
			<span
				className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.12em] text-text-tertiary"
				title={tooltip}
			>
				{label}
				<InfoIcon className="size-3 opacity-60" />
			</span>
			<span className="text-right font-mono text-sm text-text-primary">{value}</span>
		</div>
	);
}

function Row({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex items-start justify-between gap-4 px-4 py-3">
			<span className="font-mono text-[11px] uppercase tracking-[0.12em] text-text-tertiary">
				{label}
			</span>
			<span className="text-right font-mono text-sm text-text-primary">{value}</span>
		</div>
	);
}

function LaunchSuccessCard({
	onChainLaunchId,
	tokenAddress,
	symbol,
	pendingMetadata,
	ensureAuth,
	onReset,
}: {
	onChainLaunchId: bigint | undefined;
	tokenAddress: string | undefined;
	symbol: string;
	pendingMetadata: {
		website: string;
		twitterHandle: string;
		telegramHandle: string;
		discordHandle: string;
		tags: string[];
	};
	ensureAuth: () => Promise<boolean>;
	onReset: () => void;
}) {
	const [copied, setCopied] = useState(false);
	const [metadataSaved, setMetadataSaved] = useState(false);
	const metadataAttemptedRef = useRef(false);

	useEffect(() => {
		triggerConfetti();
	}, []);

	// Poll for DB id (indexer may need a few seconds)
	const { data: dbId } = useQuery({
		queryKey: ["launch-db-id", onChainLaunchId?.toString()],
		queryFn: () => getLaunchDbId(onChainLaunchId?.toString() ?? "0", FORJA_LAUNCHPAD_ADDRESS),
		enabled: onChainLaunchId !== undefined,
		refetchInterval: (query) => (query.state.data ? false : 2_000),
	});

	// Auto-save social+tags metadata once dbId resolves (creator-only, requires auth)
	useEffect(() => {
		if (!dbId || metadataAttemptedRef.current) return;
		const hasMetadata =
			!!pendingMetadata.website ||
			!!pendingMetadata.twitterHandle ||
			!!pendingMetadata.telegramHandle ||
			!!pendingMetadata.discordHandle ||
			pendingMetadata.tags.length > 0;
		if (!hasMetadata) {
			setMetadataSaved(true);
			metadataAttemptedRef.current = true;
			return;
		}
		metadataAttemptedRef.current = true;
		(async () => {
			try {
				const authed = await ensureAuth();
				if (!authed) return;
				const res = await saveLaunchMetadata({
					launchDbId: dbId,
					website: pendingMetadata.website || undefined,
					twitterHandle: pendingMetadata.twitterHandle || undefined,
					telegramHandle: pendingMetadata.telegramHandle || undefined,
					discordHandle: pendingMetadata.discordHandle || undefined,
					tags: pendingMetadata.tags,
				});
				if (res.ok) setMetadataSaved(true);
			} catch (err) {
				console.error("[launch-create] saveLaunchMetadata failed:", err);
			}
		})();
	}, [dbId, pendingMetadata, ensureAuth]);

	const launchUrl = dbId
		? `${typeof window !== "undefined" ? window.location.origin : ""}/launch/${dbId}`
		: null;

	const handleCopyLink = useCallback(() => {
		if (!launchUrl) return;
		navigator.clipboard.writeText(launchUrl);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	}, [launchUrl]);

	const handleShareX = useCallback(() => {
		const text = `Just launched $${symbol} on @forjatempo! Check it out:`;
		const url = launchUrl ?? "https://forja.fun/launch";
		window.open(
			`https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
			"_blank",
		);
	}, [symbol, launchUrl]);

	return (
		<div className="flex flex-col items-center gap-6 py-8 text-center">
			<div
				className="flex size-16 items-center justify-center rounded-2xl"
				style={{
					background: "rgba(74,222,128,0.1)",
					boxShadow: "0 4px 24px rgba(74,222,128,0.2)",
				}}
			>
				<CheckIcon className="size-8 text-green" />
			</div>
			<div>
				<h2 className="font-display text-[28px] font-normal tracking-[-0.02em] text-text-primary">
					Launch created
				</h2>
				<p className="mt-2 text-sm text-text-secondary">
					Your token is now live on the bonding curve.
				</p>
				{metadataSaved && (
					<p className="mt-1 font-mono text-[11px] uppercase tracking-[0.12em] text-green">
						Metadata saved
					</p>
				)}
			</div>

			{tokenAddress && (
				<p className="break-all font-mono text-xs text-text-tertiary">Token: {tokenAddress}</p>
			)}

			{/* Share actions */}
			<div className="flex flex-wrap justify-center gap-3">
				{dbId ? (
					<Link
						href={`/launch/${dbId}`}
						className="inline-flex items-center rounded-xl px-[22px] py-3 font-semibold text-sm transition-transform hover:-translate-y-0.5"
						style={{
							background: PINK_PURPLE_GRADIENT,
							color: "#1a0620",
							boxShadow: "0 4px 24px rgba(244,114,182,0.3)",
						}}
					>
						View launch
					</Link>
				) : (
					<button
						type="button"
						disabled
						className="inline-flex cursor-not-allowed items-center rounded-xl px-[22px] py-3 font-semibold text-sm opacity-60"
						style={{ background: PINK_PURPLE_GRADIENT, color: "#1a0620" }}
					>
						{onChainLaunchId !== undefined ? "Indexing..." : "View launches"}
					</button>
				)}
				<button
					type="button"
					onClick={handleShareX}
					className="inline-flex items-center rounded-xl border border-border-hair bg-bg-elevated px-[22px] py-3 font-mono text-[11px] uppercase tracking-[0.12em] text-text-secondary transition-colors hover:border-border-strong hover:text-text-primary"
				>
					Share on X
				</button>
				{launchUrl && (
					<button
						type="button"
						onClick={handleCopyLink}
						className="inline-flex items-center gap-1.5 rounded-xl border border-border-hair bg-bg-elevated px-[22px] py-3 font-mono text-[11px] uppercase tracking-[0.12em] text-text-secondary transition-colors hover:border-border-strong hover:text-text-primary"
					>
						<CopyIcon className="size-3" />
						{copied ? "Copied!" : "Copy link"}
					</button>
				)}
			</div>

			<button
				type="button"
				onClick={onReset}
				className="font-mono text-[11px] uppercase tracking-[0.12em] text-text-tertiary transition-colors hover:text-text-primary"
			>
				Create another
			</button>
		</div>
	);
}
