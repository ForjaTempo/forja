"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeftIcon, CheckIcon, CopyIcon, RocketIcon, WalletIcon } from "lucide-react";
import Link from "next/link";
import { type ChangeEvent, useCallback, useState } from "react";
import { parseUnits } from "viem";
import { useAccount } from "wagmi";
import { getLaunchDbId } from "@/actions/launches";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { TransactionStatus } from "@/components/ui/transaction-status";
import { useCreateLaunch } from "@/hooks/use-create-launch";
import { useTransactionEffects } from "@/hooks/use-transaction-effects";
import { useUsdcApproval } from "@/hooks/use-usdc-approval";
import { useUsdcBalance } from "@/hooks/use-usdc-balance";
import { FEES, FORJA_LAUNCHPAD_ADDRESS, TIP20_DECIMALS } from "@/lib/constants";
import { deriveTxState, formatErrorMessage } from "@/lib/format";

const IMAGE_URL_RE = /^https:\/\/[^\s]+\.(png|jpg|jpeg|gif|webp|svg)(\?[^\s]*)?$/i;

export function LaunchCreateForm() {
	const { isConnected } = useAccount();

	const [step, setStep] = useState<1 | 2>(1);
	const [name, setName] = useState("");
	const [symbol, setSymbol] = useState("");
	const [description, setDescription] = useState("");
	const [imageUri, setImageUri] = useState("");

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
	const imageValid = !imageUri || IMAGE_URL_RE.test(imageUri);
	const formValid = nameValid && symbolValid && descValid && imageValid;

	const txState = deriveTxState(isCreating, isConfirming, isSuccess, createError);

	useTransactionEffects({
		txHash,
		isConfirming,
		isSuccess,
		error: createError,
		showConfirmedToast: true,
	});

	const handleCreate = useCallback(() => {
		if (!formValid) return;
		setTxDialogOpen(true);
		createLaunch(name.trim(), symbol.trim().toUpperCase(), description.trim(), imageUri.trim());
	}, [createLaunch, name, symbol, description, imageUri, formValid]);

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
				onReset={handleReset}
			/>
		);
	}

	return (
		<div className="space-y-6">
			{step === 1 && (
				<Card className="border-anvil-gray-light bg-deep-charcoal">
					<CardHeader>
						<CardTitle className="text-steel-white">Token Details</CardTitle>
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
								className="flex w-full rounded-md border border-anvil-gray-light bg-obsidian-black/50 px-3 py-2 text-sm text-smoke placeholder:text-smoke-dark/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-molten-amber"
							/>
							<p className="text-xs text-smoke-dark">{description.length}/500 characters</p>
						</div>

						<div className="space-y-2">
							<label htmlFor="imageUri" className="text-sm font-medium text-smoke">
								Image URL <span className="text-smoke-dark">(optional, https://)</span>
							</label>
							<Input
								id="imageUri"
								placeholder="https://example.com/logo.png"
								value={imageUri}
								onChange={(e) => setImageUri(e.target.value)}
								className="border-anvil-gray-light bg-obsidian-black/50 text-smoke"
							/>
							{imageUri && !imageValid && (
								<p className="text-xs text-red-400">Must be a valid https:// image URL</p>
							)}
						</div>

						<Button
							className="w-full bg-molten-amber text-forge-black hover:bg-molten-amber/90"
							disabled={!formValid}
							onClick={() => setStep(2)}
						>
							Review Launch
						</Button>
					</CardContent>
				</Card>
			)}

			{step === 2 && (
				<>
					<Button variant="ghost" size="sm" onClick={() => setStep(1)} className="text-smoke-dark">
						<ArrowLeftIcon className="mr-1 size-4" />
						Back to Details
					</Button>

					<Card className="border-anvil-gray-light bg-deep-charcoal">
						<CardHeader>
							<CardTitle className="text-steel-white">Review & Launch</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-2 rounded-lg border border-anvil-gray-light bg-obsidian-black/30 p-4">
								<Row label="Name" value={name} />
								<Row label="Symbol" value={symbol.toUpperCase()} />
								{description && <Row label="Description" value={description} />}
								{imageUri && <Row label="Image" value={imageUri} />}
								<hr className="border-anvil-gray-light" />
								<Row label="Total Supply" value="1,000,000,000" />
								<Row label="Initial Price" value="~$0.000028" />
								<Row label="Graduation At" value="$69,000 raised" />
								<Row label="Price Multiplier" value="~11x" />
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
									className="w-full bg-molten-amber text-forge-black hover:bg-molten-amber/90"
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
									className="w-full bg-molten-amber text-forge-black hover:bg-molten-amber/90"
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
	onReset,
}: {
	onChainLaunchId: bigint | undefined;
	tokenAddress: string | undefined;
	symbol: string;
	onReset: () => void;
}) {
	const [copied, setCopied] = useState(false);

	// Poll for DB id (indexer may need a few seconds)
	const { data: dbId } = useQuery({
		queryKey: ["launch-db-id", onChainLaunchId?.toString()],
		queryFn: () => getLaunchDbId(onChainLaunchId?.toString() ?? "0"),
		enabled: onChainLaunchId !== undefined,
		refetchInterval: (query) => (query.state.data ? false : 2_000),
	});

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
				</div>

				{tokenAddress && <p className="font-mono text-xs text-smoke-dark">Token: {tokenAddress}</p>}

				{/* Share actions */}
				<div className="flex flex-wrap justify-center gap-3">
					{dbId ? (
						<Link href={`/launch/${dbId}`}>
							<Button className="bg-molten-amber text-forge-black hover:bg-molten-amber/90">
								View Launch
							</Button>
						</Link>
					) : (
						<Button className="bg-molten-amber text-forge-black" disabled>
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
