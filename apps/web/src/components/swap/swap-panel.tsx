"use client";

import {
	AlertTriangleIcon,
	ArrowDownIcon,
	ArrowRightIcon,
	CheckCircle2Icon,
	ExternalLinkIcon,
	Loader2Icon,
	SettingsIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { formatUnits, type Hex, parseUnits } from "viem";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useExplorerUrl } from "@/hooks/use-explorer-url";
import { usePermit2Approval } from "@/hooks/use-permit2-approval";
import { useSwap } from "@/hooks/use-swap";
import { useSwapQuote } from "@/hooks/use-swap-quote";
import { useTokenBalance } from "@/hooks/use-token-balance";
import { useTokenInfo } from "@/hooks/use-token-info";
import { useTransactionToast } from "@/hooks/use-transaction-toast";
import {
	getSwapRouterAddress,
	hasSwap,
	SUPPORTED_CHAIN_IDS,
	TEMPO_CHAIN_ID,
	TEMPO_MODERATO_CHAIN_ID,
} from "@/lib/constants";
import { formatErrorMessage } from "@/lib/format";
import { cn } from "@/lib/utils";
import { type TokenOption, TokenPicker } from "./token-picker";

const VALID_AMOUNT = /^\d*\.?\d*$/;
const SLIPPAGE_PRESETS = [
	{ label: "0.5%", bps: 50 },
	{ label: "1%", bps: 100 },
	{ label: "3%", bps: 300 },
] as const;

const DEFAULT_DEADLINE_SEC = 20 * 60; // 20 minutes

const GOLD_GRADIENT_STYLE = {
	background: "linear-gradient(135deg, #ffe5a8, #f0d38a 50%, #e8b860)",
	boxShadow: "0 4px 30px rgba(240,211,138,0.3), inset 0 1px 0 rgba(255,255,255,0.5)",
};

interface SwapPanelProps {
	initialTokenIn?: TokenOption;
	initialTokenOut?: TokenOption;
	onSwapSuccess?: () => void;
}

export function SwapPanel({ initialTokenIn, initialTokenOut, onSwapSuccess }: SwapPanelProps) {
	const { isConnected } = useAccount();
	const chainId = useChainId();
	const { switchChain } = useSwitchChain();
	const { txConfirmed } = useTransactionToast();
	const explorer = useExplorerUrl();

	const isSupportedChain = SUPPORTED_CHAIN_IDS.has(chainId);
	const isTestnet = chainId === TEMPO_MODERATO_CHAIN_ID;
	const routerAddress = getSwapRouterAddress(chainId);
	const routerDeployed = routerAddress !== "0x" && routerAddress.length === 42;

	const [tokenIn, setTokenIn] = useState<TokenOption | undefined>(initialTokenIn);
	const [tokenOut, setTokenOut] = useState<TokenOption | undefined>(initialTokenOut);
	const [amount, setAmount] = useState("");
	const [slippageBps, setSlippageBps] = useState<number>(50);
	const [showSettings, setShowSettings] = useState(false);
	const [pickerSide, setPickerSide] = useState<"in" | "out" | null>(null);

	const tokenInInfo = useTokenInfo(tokenIn?.address);
	const tokenOutInfo = useTokenInfo(tokenOut?.address);
	const tokenInDecimals = tokenIn?.decimals ?? tokenInInfo.decimals ?? 6;
	const tokenOutDecimals = tokenOut?.decimals ?? tokenOutInfo.decimals ?? 6;

	const inBalance = useTokenBalance(tokenIn?.address);

	const parsedAmountIn = useMemo(() => {
		if (!amount || !VALID_AMOUNT.test(amount) || Number(amount) <= 0) return 0n;
		try {
			return parseUnits(amount, tokenInDecimals);
		} catch {
			return 0n;
		}
	}, [amount, tokenInDecimals]);

	const {
		quote,
		isLoading: isQuoting,
		error: quoteError,
	} = useSwapQuote({
		tokenIn: tokenIn?.address,
		tokenOut: tokenOut?.address,
		amountIn: parsedAmountIn,
		slippageBps,
		enabled: !!tokenIn && !!tokenOut && parsedAmountIn > 0n,
	});

	const permit2 = usePermit2Approval({
		tokenAddress: tokenIn?.address as Hex | undefined,
		amount: parsedAmountIn,
	});

	const swap = useSwap();

	useEffect(() => {
		if (swap.isConfirmed && swap.txHash) {
			txConfirmed(swap.txHash);
			setAmount("");
			inBalance.refetch();
			// Nudge the history card to re-fetch on a short cadence until the
			// indexer picks the event up — three retries over ~1 minute cover
			// the worst-case cron delay.
			[3_000, 15_000, 40_000].forEach((delay) => {
				setTimeout(() => onSwapSuccess?.(), delay);
			});
			onSwapSuccess?.();
			// Let the user acknowledge the confirmed tx via the success card
			// before wiping state — otherwise the explorer link disappears.
			const t = setTimeout(() => swap.reset(), 15_000);
			return () => clearTimeout(t);
		}
	}, [swap.isConfirmed, swap.txHash, swap.reset, txConfirmed, inBalance, onSwapSuccess]);

	const insufficientBalance =
		!!inBalance.balance && parsedAmountIn > 0n && parsedAmountIn > inBalance.balance;

	const swapDisabled =
		!isConnected ||
		!hasSwap ||
		!isSupportedChain ||
		!routerDeployed ||
		!tokenIn ||
		!tokenOut ||
		parsedAmountIn === 0n ||
		!quote ||
		insufficientBalance ||
		isQuoting ||
		swap.isSigning ||
		swap.isSwapping ||
		swap.isConfirming;

	const handleSwap = async () => {
		if (!quote) return;
		try {
			await swap.swap(quote, DEFAULT_DEADLINE_SEC);
		} catch {
			// surfaced via swap.error
		}
	};

	const handleFlip = () => {
		const next = tokenIn;
		setTokenIn(tokenOut);
		setTokenOut(next);
		setAmount("");
	};

	const setPercent = (pct: number) => {
		if (!inBalance.balance) return;
		const portion = (inBalance.balance * BigInt(Math.round(pct * 100))) / 10_000n;
		setAmount(formatUnits(portion, tokenInDecimals));
	};

	const formattedOut =
		quote && !isQuoting ? formatUnits(BigInt(quote.amountOut), tokenOutDecimals) : undefined;
	const formattedMinOut = quote
		? formatUnits(BigInt(quote.minAmountOut), tokenOutDecimals)
		: undefined;
	const formattedFee = quote ? formatUnits(BigInt(quote.forjaFee), tokenInDecimals) : undefined;

	const priceImpactPct = quote ? quote.priceImpactBps / 100 : 0;
	const highImpact = priceImpactPct >= 2;

	return (
		<div className="space-y-4 rounded-3xl border border-border-subtle bg-bg-card p-5 sm:p-6">
			{/* Chain guard */}
			{isConnected && !isSupportedChain && (
				<div className="flex items-start gap-2 rounded-xl border border-red/40 bg-red/5 p-3 text-xs text-red">
					<AlertTriangleIcon className="size-4 shrink-0" />
					<div className="flex-1">
						<p className="font-medium">Wrong network</p>
						<p className="mt-0.5 text-red/80">
							FORJA Swap only works on Tempo. Your wallet is on another chain.
						</p>
						<button
							type="button"
							onClick={() => switchChain({ chainId: TEMPO_CHAIN_ID })}
							className="mt-1 text-red underline underline-offset-2 hover:text-text-primary"
						>
							Switch to Tempo mainnet
						</button>
					</div>
				</div>
			)}
			{isConnected && isTestnet && (
				<div className="flex items-start gap-2 rounded-xl border border-ember/30 bg-ember/5 p-3 text-xs text-ember">
					<AlertTriangleIcon className="size-4 shrink-0" />
					<div>
						<p className="font-medium">Testnet (Moderato)</p>
						<p className="mt-0.5 text-ember/80">
							Swaps execute on-chain but aren't indexed into history — only mainnet activity appears
							in your dashboard.
						</p>
					</div>
				</div>
			)}

			{/* Header */}
			<div className="flex items-center justify-between">
				<h2 className="font-display text-[22px] tracking-[-0.02em] text-text-primary">Swap</h2>
				<button
					type="button"
					onClick={() => setShowSettings((s) => !s)}
					className="inline-flex size-8 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-bg-field hover:text-text-primary"
					title="Slippage settings"
				>
					<SettingsIcon className="size-4" />
				</button>
			</div>

			{/* Slippage settings */}
			{showSettings && (
				<div className="rounded-xl border border-border-hair bg-bg-field p-3">
					<p className="mb-2 font-mono text-[11px] uppercase tracking-[0.12em] text-text-tertiary">
						Slippage tolerance
					</p>
					<div className="flex gap-2">
						{SLIPPAGE_PRESETS.map((preset) => (
							<button
								type="button"
								key={preset.bps}
								onClick={() => setSlippageBps(preset.bps)}
								className={cn(
									"flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors",
									slippageBps === preset.bps
										? "border-indigo bg-indigo/10 text-indigo"
										: "border-border-hair text-text-secondary hover:border-border-subtle hover:text-text-primary",
								)}
							>
								{preset.label}
							</button>
						))}
					</div>
				</div>
			)}

			{/* Sell side */}
			<div className="space-y-2 rounded-2xl border border-border-hair bg-bg-field p-4">
				<div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.1em] text-text-tertiary">
					<span>You pay</span>
					{inBalance.balance !== undefined && tokenIn && (
						<span className="normal-case tracking-normal">
							Balance: {formatUnits(inBalance.balance, tokenInDecimals)} {tokenIn.symbol}
						</span>
					)}
				</div>
				<div className="flex items-center gap-3">
					<Input
						inputMode="decimal"
						value={amount}
						onChange={(e) => {
							if (VALID_AMOUNT.test(e.target.value)) setAmount(e.target.value);
						}}
						placeholder="0.0"
						className="h-12 border-0 bg-transparent px-0 font-display text-3xl tracking-[-0.02em] focus-visible:ring-0"
					/>
					<TokenSelectButton
						token={tokenIn}
						onClick={() => setPickerSide("in")}
						placeholder="Select"
					/>
				</div>
				<div className="flex gap-1.5">
					{[25, 50, 75, 100].map((pct) => (
						<button
							key={pct}
							type="button"
							onClick={() => setPercent(pct)}
							disabled={!inBalance.balance}
							className="rounded-md border border-border-hair bg-bg-elevated px-2 py-0.5 font-mono text-[11px] text-text-secondary transition-colors hover:border-border-subtle hover:text-text-primary disabled:opacity-40"
						>
							{pct === 100 ? "MAX" : `${pct}%`}
						</button>
					))}
				</div>
			</div>

			{/* Flip */}
			<div className="flex justify-center">
				<button
					type="button"
					onClick={handleFlip}
					className="rounded-full border border-border-hair bg-bg-elevated p-2 text-text-secondary transition-all hover:rotate-180 hover:border-gold/40 hover:text-gold"
					aria-label="Flip swap direction"
				>
					<ArrowDownIcon className="size-4" />
				</button>
			</div>

			{/* Buy side */}
			<div className="space-y-2 rounded-2xl border border-border-hair bg-bg-field p-4">
				<div className="font-mono text-[11px] uppercase tracking-[0.1em] text-text-tertiary">
					You receive (estimate)
				</div>
				<div className="flex items-center gap-3">
					<div className="flex h-12 flex-1 items-center font-display text-3xl tracking-[-0.02em] text-text-primary">
						{isQuoting ? <Skeleton className="h-7 w-32" /> : (formattedOut ?? "0.0")}
					</div>
					<TokenSelectButton
						token={tokenOut}
						onClick={() => setPickerSide("out")}
						placeholder="Select"
					/>
				</div>
			</div>

			{/* Quote details */}
			{quote && (
				<div className="space-y-1.5 rounded-xl border border-border-hair bg-bg-field/60 px-3 py-2.5 font-mono text-xs text-text-secondary">
					<div className="flex justify-between">
						<span className="text-text-tertiary">Route</span>
						<span className="text-text-primary">
							{quote.venue === "enshrined" ? "Tempo native DEX" : "Uniswap v4"}
						</span>
					</div>
					<div className="flex justify-between">
						<span className="text-text-tertiary">Price impact</span>
						<span className={cn(highImpact ? "text-ember" : "text-text-primary")}>
							{priceImpactPct.toFixed(2)}%
						</span>
					</div>
					<div className="flex justify-between">
						<span className="text-text-tertiary">Min received ({slippageBps / 100}% slip)</span>
						<span className="text-text-primary">
							{formattedMinOut} {tokenOut?.symbol}
						</span>
					</div>
					<div className="flex justify-between">
						<span className="text-text-tertiary">FORJA fee (0.25%)</span>
						<span className="text-text-primary">
							{formattedFee} {tokenIn?.symbol}
						</span>
					</div>
					{quote.venue === "v4" && (
						<div className="flex justify-between">
							<span className="text-text-tertiary">Pool fee tier</span>
							<span className="text-text-primary">{(quote.poolKey.fee / 10_000).toFixed(2)}%</span>
						</div>
					)}
				</div>
			)}

			{quoteError && <p className="text-center text-xs text-red">{quoteError}</p>}

			{/* Wallet-prompt hint */}
			{(swap.isSigning || swap.isSwapping) && (
				<div className="flex items-center gap-2 rounded-xl border border-indigo/30 bg-indigo/5 px-3 py-2 text-xs text-indigo">
					<Loader2Icon className="size-4 shrink-0 animate-spin" />
					<span>
						{swap.isSigning
							? "Sign the permit in your wallet…"
							: "Confirm the swap transaction in your wallet. If the prompt didn't appear, open the wallet extension manually."}
					</span>
				</div>
			)}

			{/* Success card */}
			{swap.isConfirmed && swap.txHash && (
				<div className="flex items-start gap-2 rounded-xl border border-green/30 bg-green/5 px-3 py-2 text-xs">
					<CheckCircle2Icon className="size-4 shrink-0 text-green" />
					<div className="flex-1">
						<p className="font-medium text-green">Swap confirmed</p>
						<a
							href={`${explorer}/tx/${swap.txHash}`}
							target="_blank"
							rel="noopener noreferrer"
							className="mt-0.5 inline-flex items-center gap-1 text-green/80 hover:text-green"
						>
							View on explorer
							<ExternalLinkIcon className="size-3" />
						</a>
						<p className="mt-1 text-text-tertiary">Appearing in your history in a few seconds…</p>
					</div>
				</div>
			)}

			{/* Action buttons */}
			{!hasSwap && (
				<p className="text-center text-xs text-ember">
					Swap is not yet enabled in this environment.
				</p>
			)}

			{!isConnected && (
				<button
					type="button"
					disabled
					className="flex w-full items-center justify-center gap-2 rounded-xl border border-border-hair bg-bg-field px-6 py-3.5 font-semibold text-[15px] text-text-tertiary"
				>
					Connect wallet to swap
				</button>
			)}

			{isConnected && hasSwap && (
				<>
					{permit2.needsApproval && parsedAmountIn > 0n && (
						<button
							type="button"
							onClick={() => permit2.approve()}
							disabled={permit2.isApproving || permit2.isApprovalConfirming || !tokenIn}
							className="flex w-full items-center justify-center gap-2 rounded-xl border border-indigo/40 bg-indigo/10 px-6 py-3.5 font-semibold text-[15px] text-indigo transition-colors hover:bg-indigo/15 disabled:opacity-50"
						>
							{permit2.isApproving || permit2.isApprovalConfirming
								? "Approving Permit2…"
								: `Approve ${tokenIn?.symbol ?? "token"} for Permit2`}
						</button>
					)}

					{(!permit2.needsApproval || parsedAmountIn === 0n) && (
						<button
							type="button"
							onClick={handleSwap}
							disabled={swapDisabled}
							className={cn(
								"flex w-full items-center justify-center gap-2.5 rounded-xl px-6 py-3.5 font-semibold text-[15px] transition-transform",
								swapDisabled
									? "cursor-not-allowed border border-border-hair bg-bg-field text-text-tertiary"
									: "text-[#1a1307] hover:-translate-y-0.5",
							)}
							style={swapDisabled ? undefined : GOLD_GRADIENT_STYLE}
						>
							{insufficientBalance
								? `Insufficient ${tokenIn?.symbol ?? ""}`
								: swap.isSigning
									? "Sign Permit…"
									: swap.isSwapping
										? "Confirming…"
										: swap.isConfirming
											? "Waiting for tx…"
											: !quote && parsedAmountIn > 0n && !isQuoting
												? "No route"
												: highImpact
													? "Swap anyway (high impact)"
													: "Swap"}
							{!swapDisabled && <ArrowRightIcon className="size-4" />}
						</button>
					)}
				</>
			)}

			{(permit2.approveError || swap.error) && (
				<p className="rounded-xl border border-red/30 bg-red/10 px-3 py-2 text-xs text-red">
					{formatErrorMessage(permit2.approveError ?? swap.error)}
				</p>
			)}

			<TokenPicker
				open={pickerSide !== null}
				onOpenChange={(open) => !open && setPickerSide(null)}
				selectedAddress={pickerSide === "in" ? tokenIn?.address : tokenOut?.address}
				excludeAddress={pickerSide === "in" ? tokenOut?.address : tokenIn?.address}
				onSelect={(token) => {
					if (pickerSide === "in") setTokenIn(token);
					else if (pickerSide === "out") setTokenOut(token);
				}}
			/>
		</div>
	);
}

function TokenSelectButton({
	token,
	onClick,
	placeholder,
}: {
	token: TokenOption | undefined;
	onClick: () => void;
	placeholder: string;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className="flex shrink-0 items-center gap-2 rounded-full border border-border-hair bg-bg-elevated px-3.5 py-1.5 text-sm font-medium text-text-primary transition-colors hover:border-gold/40"
		>
			{token ? token.symbol : placeholder}
		</button>
	);
}
