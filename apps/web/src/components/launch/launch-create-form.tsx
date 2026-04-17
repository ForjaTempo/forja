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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { triggerConfetti } from "@/components/ui/confetti";
import { FilterChip } from "@/components/ui/filter-chip";
import { ImageUpload } from "@/components/ui/image-upload";
import { Input } from "@/components/ui/input";
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
			<div className="flex min-h-[40vh] flex-col items-center justify-center gap-4">
				<WalletIcon className="size-12 text-smoke-dark" />
				<h2 className="text-xl font-semibold text-steel-white">Connect Your Wallet</h2>
				<p className="text-sm text-smoke-dark">Connect your wallet to create a launch.</p>
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
		<div className="space-y-6">
			<Stepper step={step} />

			{step === 1 && (
				<Card className="border-anvil-gray-light bg-deep-charcoal">
					<CardHeader>
						<CardTitle className="text-steel-white">Token Identity</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="space-y-2">
							<label htmlFor="name" className="text-sm font-medium text-smoke">
								Name
							</label>
							<Input
								id="name"
								placeholder="My Token"
								value={name}
								onChange={(e) => setName(e.target.value)}
								maxLength={50}
								className="border-anvil-gray-light bg-obsidian-black/50 text-smoke"
							/>
							<p className="text-xs text-smoke-dark">{name.length}/50 characters</p>
						</div>

						<div className="space-y-2">
							<label htmlFor="symbol" className="text-sm font-medium text-smoke">
								Symbol
							</label>
							<Input
								id="symbol"
								placeholder="MTK"
								value={symbol}
								onChange={(e) => setSymbol(e.target.value.toUpperCase())}
								maxLength={10}
								className="border-anvil-gray-light bg-obsidian-black/50 text-smoke"
							/>
							<p className="text-xs text-smoke-dark">{symbol.length}/10 characters</p>
						</div>

						<div className="space-y-2">
							<label htmlFor="description" className="text-sm font-medium text-smoke">
								Description <span className="text-smoke-dark">(optional)</span>
							</label>
							<textarea
								id="description"
								placeholder="Describe your token..."
								value={description}
								onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
								maxLength={500}
								rows={3}
								className="flex w-full rounded-md border border-anvil-gray-light bg-obsidian-black/50 px-3 py-2 text-sm text-smoke placeholder:text-smoke-dark/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
							/>
							<p className="text-xs text-smoke-dark">{description.length}/500 characters</p>
						</div>

						<div className="space-y-2">
							<span className="text-sm font-medium text-smoke">
								Image <span className="text-smoke-dark">(optional)</span>
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
							className="flex w-full items-center justify-between rounded-md border border-anvil-gray-light bg-obsidian-black/30 px-3 py-2 text-sm text-smoke transition-colors hover:bg-obsidian-black/50"
						>
							<span className="flex items-center gap-2">
								<GlobeIcon className="size-4" />
								Social Links & Tags <span className="text-smoke-dark">(optional)</span>
							</span>
							{socialOpen ? (
								<ChevronUpIcon className="size-4" />
							) : (
								<ChevronDownIcon className="size-4" />
							)}
						</button>
						{socialOpen && (
							<div className="space-y-4 rounded-md border border-anvil-gray-light bg-obsidian-black/20 p-4">
								<p className="text-xs text-smoke-dark">
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
										<span className="text-sm font-medium text-smoke">Tags</span>
										<span className="text-xs text-smoke-dark">
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

						<Button
							className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
							disabled={!identityValid}
							onClick={() => setStep(2)}
						>
							Continue to Parameters
						</Button>
					</CardContent>
				</Card>
			)}

			{step === 2 && (
				<>
					<Button variant="ghost" size="sm" onClick={() => setStep(1)} className="text-smoke-dark">
						<ArrowLeftIcon className="mr-1 size-4" />
						Back to Identity
					</Button>

					<Card className="border-anvil-gray-light bg-deep-charcoal">
						<CardHeader>
							<CardTitle className="text-steel-white">Launch Parameters</CardTitle>
						</CardHeader>
						<CardContent className="space-y-5">
							<p className="text-xs text-smoke-dark">
								These are protocol parameters. They are fixed for all launches.
							</p>

							{/* Supply breakdown */}
							<div className="space-y-2">
								<div className="flex items-center justify-between text-sm">
									<span className="text-smoke">Total Supply</span>
									<span className="font-mono text-steel-white">1,000,000,000</span>
								</div>
								<div className="h-2 overflow-hidden rounded-full bg-obsidian-black/50">
									<div className="flex h-full">
										<div className="h-full bg-indigo" style={{ width: "80%" }} />
										<div className="h-full bg-forge-green" style={{ width: "20%" }} />
									</div>
								</div>
								<div className="flex justify-between text-xs text-smoke-dark">
									<span>
										<span className="inline-block size-2 rounded-full bg-indigo" /> 800M curve (80%)
									</span>
									<span>
										<span className="inline-block size-2 rounded-full bg-forge-green" /> 200M LP
										(20%)
									</span>
								</div>
							</div>

							<hr className="border-anvil-gray-light" />

							{/* Fee stack */}
							<div className="space-y-2 text-sm">
								<ParamRow
									label="Creation Fee"
									value={`Est. ${FEES.launchCreate} USDC`}
									tooltip="One-time fee paid to create the launch."
								/>
								<ParamRow
									label="Trading Fee"
									value="1% per trade"
									tooltip="0.5% goes to you (creator), 0.5% to FORJA protocol."
								/>
								<ParamRow
									label="Graduation Threshold"
									value="$69,000 USDC raised"
									tooltip="When raised reaches $69K, liquidity migrates to Uniswap v4 and trading continues there."
								/>
							</div>

							<hr className="border-anvil-gray-light" />

							{/* Anti-snipe */}
							<div className="space-y-2 text-sm">
								<ParamRow
									label="Max Single Buy"
									value="5,000 USDC"
									tooltip="Anti-snipe cap: no one can buy more than this in a single transaction."
								/>
								<ParamRow
									label="Min Single Buy"
									value="1 USDC"
									tooltip="Minimum trade size to prevent dust/spam."
								/>
								<ParamRow
									label="Launch Timeout"
									value="30 days"
									tooltip="If not graduated within 30 days, the launch enters failed state and buyers can exit."
								/>
							</div>

							<Button
								className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
								onClick={() => setStep(3)}
							>
								Continue to Review
							</Button>
						</CardContent>
					</Card>
				</>
			)}

			{step === 3 && (
				<>
					<Button variant="ghost" size="sm" onClick={() => setStep(2)} className="text-smoke-dark">
						<ArrowLeftIcon className="mr-1 size-4" />
						Back to Parameters
					</Button>

					<Card className="border-anvil-gray-light bg-deep-charcoal">
						<CardHeader>
							<CardTitle className="text-steel-white">Review & Launch</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							{/* Preview card — looks like real launch card */}
							<div className="rounded-lg border border-anvil-gray-light bg-obsidian-black/30 p-4">
								<div className="mb-4 flex items-center gap-3">
									{imageUri ? (
										// biome-ignore lint/performance/noImgElement: local preview
										<img
											src={imageUri}
											alt={symbol}
											className="size-12 rounded-full object-cover"
										/>
									) : (
										<div className="flex size-12 items-center justify-center rounded-full bg-indigo/20 text-indigo">
											<RocketIcon className="size-5" />
										</div>
									)}
									<div className="min-w-0">
										<p className="truncate font-semibold text-steel-white">{name}</p>
										<p className="text-xs text-smoke-dark">${symbol.toUpperCase()}</p>
									</div>
								</div>

								{description && <p className="mb-3 text-sm text-smoke">{description}</p>}

								{tags.length > 0 && (
									<div className="mb-3 flex flex-wrap gap-1.5">
										{tags.map((tag) => (
											<Badge key={tag} variant="outline" className="text-xs">
												{tag}
											</Badge>
										))}
									</div>
								)}

								{(website || twitterHandle || telegramHandle || discordHandle) && (
									<div className="flex flex-wrap gap-2 text-xs text-smoke-dark">
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

							<div className="space-y-2 rounded-lg border border-anvil-gray-light bg-obsidian-black/30 p-4">
								<Row label="Total Supply" value="1,000,000,000" />
								<Row label="Initial Price" value="~$0.000028" />
								<Row label="Graduation At" value="$69,000 raised" />
								<Row label="Trading Fee" value="1% (0.5% to you)" />
								<Row label="Creation Fee" value={`Est. ${FEES.launchCreate} USDC`} />
							</div>

							{!hasEnoughBalance && (
								<p className="text-center text-sm text-red-400">
									Insufficient USDC balance for creation fee
								</p>
							)}

							{approveError && (
								<p className="text-center text-sm text-red-400">
									{formatErrorMessage(approveError)}
								</p>
							)}
							{createError && (
								<p className="text-center text-sm text-red-400">
									{formatErrorMessage(createError)}
								</p>
							)}

							{needsApproval && !isApprovalConfirmed ? (
								<Button
									className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
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
								</Button>
							) : (
								<Button
									className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
									disabled={!hasEnoughBalance || isCreating || isConfirming}
									onClick={handleCreate}
								>
									<RocketIcon className="mr-2 size-4" />
									{isCreating ? "Creating..." : isConfirming ? "Confirming..." : "Create Launch"}
								</Button>
							)}

							<TransactionStatus
								open={txDialogOpen && txState !== "idle"}
								onOpenChange={handleTxDialogClose}
								state={txState}
								txHash={txHash}
								title="Create Launch"
							/>
						</CardContent>
					</Card>
				</>
			)}
		</div>
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
								"flex size-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors",
								isDone && "border-indigo bg-indigo text-white",
								isActive && "border-indigo text-indigo ring-2 ring-indigo/30",
								!isActive && !isDone && "border-anvil-gray-light text-smoke-dark",
							)}
						>
							{isDone ? <CheckIcon className="size-4" /> : n}
						</div>
						<span
							className={cn(
								"hidden text-xs sm:inline",
								isActive ? "font-medium text-steel-white" : "text-smoke-dark",
							)}
						>
							{label}
						</span>
						{i < labels.length - 1 && (
							<div
								className={cn(
									"h-px flex-1 transition-colors",
									isDone ? "bg-indigo" : "bg-anvil-gray-light",
								)}
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
			<label htmlFor={id} className="flex items-center gap-1.5 text-xs font-medium text-smoke">
				{icon}
				{label}
			</label>
			<Input
				id={id}
				placeholder={placeholder}
				value={value}
				onChange={(e) => onChange(e.target.value)}
				maxLength={200}
				className="border-anvil-gray-light bg-obsidian-black/50 text-sm text-smoke"
			/>
		</div>
	);
}

function ParamRow({ label, value, tooltip }: { label: string; value: string; tooltip: string }) {
	return (
		<div className="flex items-start justify-between gap-4">
			<span className="flex items-center gap-1 text-smoke-dark" title={tooltip}>
				{label}
				<InfoIcon className="size-3 text-smoke-dark/60" />
			</span>
			<span className="text-right font-mono text-sm text-steel-white">{value}</span>
		</div>
	);
}

function Row({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex items-start justify-between gap-4">
			<span className="text-sm text-smoke-dark">{label}</span>
			<span className="text-right text-sm text-steel-white">{value}</span>
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
		<Card className="border-anvil-gray-light bg-deep-charcoal">
			<CardContent className="flex flex-col items-center gap-6 p-8">
				<div className="flex size-16 items-center justify-center rounded-full bg-emerald-500/10">
					<CheckIcon className="size-8 text-emerald-400" />
				</div>
				<div className="text-center">
					<h2 className="text-xl font-bold text-steel-white">Launch Created!</h2>
					<p className="mt-2 text-sm text-smoke-dark">
						Your token is now live on the bonding curve.
					</p>
					{metadataSaved && <p className="mt-1 text-xs text-emerald-400">Metadata saved.</p>}
				</div>

				{tokenAddress && <p className="font-mono text-xs text-smoke-dark">Token: {tokenAddress}</p>}

				{/* Share actions */}
				<div className="flex flex-wrap justify-center gap-3">
					{dbId ? (
						<Link href={`/launch/${dbId}`}>
							<Button className="bg-primary text-primary-foreground hover:bg-primary/90">
								View Launch
							</Button>
						</Link>
					) : (
						<Button className="bg-primary text-primary-foreground" disabled>
							{onChainLaunchId !== undefined ? "Indexing..." : "View Launches"}
						</Button>
					)}
					<Button variant="outline" onClick={handleShareX}>
						Share on X
					</Button>
					{launchUrl && (
						<Button variant="outline" onClick={handleCopyLink}>
							<CopyIcon className="mr-1 size-3" />
							{copied ? "Copied!" : "Copy Link"}
						</Button>
					)}
				</div>

				<Button variant="ghost" className="text-sm text-smoke-dark" onClick={onReset}>
					Create Another
				</Button>
			</CardContent>
		</Card>
	);
}
