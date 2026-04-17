"use client";

import { ArrowDownIcon, ArrowRightIcon, SettingsIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { formatUnits, type Hex, parseUnits } from "viem";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermit2Approval } from "@/hooks/use-permit2-approval";
import { useSwap } from "@/hooks/use-swap";
import { useSwapQuote } from "@/hooks/use-swap-quote";
import { useTokenBalance } from "@/hooks/use-token-balance";
import { useTokenInfo } from "@/hooks/use-token-info";
import { useTransactionToast } from "@/hooks/use-transaction-toast";
import { hasSwap } from "@/lib/constants";
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

interface SwapPanelProps {
	initialTokenIn?: TokenOption;
	initialTokenOut?: TokenOption;
}

export function SwapPanel({ initialTokenIn, initialTokenOut }: SwapPanelProps) {
	const { isConnected } = useAccount();
	const { txConfirmed } = useTransactionToast();

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
			swap.reset();
			inBalance.refetch();
		}
	}, [swap.isConfirmed, swap.txHash, swap.reset, txConfirmed, inBalance]);

	const insufficientBalance =
		!!inBalance.balance && parsedAmountIn > 0n && parsedAmountIn > inBalance.balance;

	const swapDisabled =
		!isConnected ||
		!hasSwap ||
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
		<Card className="border-border-subtle bg-surface-card">
			<CardContent className="space-y-4 p-5">
				{/* Header */}
				<div className="flex items-center justify-between">
					<h2 className="text-base font-semibold text-steel-white">Swap</h2>
					<Button
						variant="ghost"
						size="sm"
						onClick={() => setShowSettings((s) => !s)}
						className="h-8 px-2 text-smoke"
					>
						<SettingsIcon className="size-4" />
					</Button>
				</div>

				{/* Slippage settings */}
				{showSettings && (
					<div className="rounded-lg border border-border-subtle bg-surface-field p-3">
						<p className="mb-2 text-xs font-medium text-smoke">Slippage tolerance</p>
						<div className="flex gap-2">
							{SLIPPAGE_PRESETS.map((preset) => (
								<button
									type="button"
									key={preset.bps}
									onClick={() => setSlippageBps(preset.bps)}
									className={cn(
										"flex-1 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors",
										slippageBps === preset.bps
											? "border-indigo bg-indigo/10 text-indigo"
											: "border-border-subtle text-smoke hover:border-indigo/40",
									)}
								>
									{preset.label}
								</button>
							))}
						</div>
					</div>
				)}

				{/* Sell side */}
				<div className="space-y-2 rounded-xl border border-border-subtle bg-surface-field p-4">
					<div className="flex items-center justify-between text-xs text-smoke-dark">
						<span>You pay</span>
						{inBalance.balance !== undefined && tokenIn && (
							<span>
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
							className="h-12 border-0 bg-transparent px-0 text-2xl font-semibold focus-visible:ring-0"
						/>
						<TokenSelectButton
							token={tokenIn}
							onClick={() => setPickerSide("in")}
							placeholder="Select"
						/>
					</div>
					<div className="flex gap-2">
						{[25, 50, 75, 100].map((pct) => (
							<button
								key={pct}
								type="button"
								onClick={() => setPercent(pct)}
								disabled={!inBalance.balance}
								className="rounded-md border border-border-subtle px-2 py-0.5 text-xs text-smoke transition-colors hover:border-indigo/40 disabled:opacity-40"
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
						className="rounded-full border border-border-subtle bg-surface-card p-1.5 text-smoke transition-colors hover:text-indigo"
					>
						<ArrowDownIcon className="size-4" />
					</button>
				</div>

				{/* Buy side */}
				<div className="space-y-2 rounded-xl border border-border-subtle bg-surface-field p-4">
					<div className="text-xs text-smoke-dark">You receive (estimate)</div>
					<div className="flex items-center gap-3">
						<div className="flex h-12 flex-1 items-center text-2xl font-semibold text-steel-white">
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
					<div className="space-y-1.5 rounded-lg bg-surface-field/50 px-3 py-2.5 text-xs text-smoke">
						<div className="flex justify-between">
							<span>Price impact</span>
							<span className={cn(highImpact && "text-amber-400")}>
								{priceImpactPct.toFixed(2)}%
							</span>
						</div>
						<div className="flex justify-between">
							<span>Min received ({slippageBps / 100}% slip)</span>
							<span className="text-steel-white">
								{formattedMinOut} {tokenOut?.symbol}
							</span>
						</div>
						<div className="flex justify-between">
							<span>FORJA fee (0.25%)</span>
							<span>
								{formattedFee} {tokenIn?.symbol}
							</span>
						</div>
						<div className="flex justify-between">
							<span>Pool fee tier</span>
							<span>{(quote.poolKey.fee / 10_000).toFixed(2)}%</span>
						</div>
					</div>
				)}

				{quoteError && <p className="text-center text-xs text-red-400">{quoteError}</p>}

				{/* Action buttons */}
				{!hasSwap && (
					<p className="text-center text-xs text-amber-400">
						Swap is not yet enabled in this environment.
					</p>
				)}

				{!isConnected && (
					<Button disabled className="w-full" size="lg">
						Connect wallet to swap
					</Button>
				)}

				{isConnected && hasSwap && (
					<>
						{permit2.needsApproval && parsedAmountIn > 0n && (
							<Button
								onClick={() => permit2.approve()}
								disabled={permit2.isApproving || permit2.isApprovalConfirming || !tokenIn}
								className="w-full"
								size="lg"
							>
								{permit2.isApproving || permit2.isApprovalConfirming
									? "Approving Permit2…"
									: `Approve ${tokenIn?.symbol ?? "token"} for Permit2`}
							</Button>
						)}

						{(!permit2.needsApproval || parsedAmountIn === 0n) && (
							<Button onClick={handleSwap} disabled={swapDisabled} className="w-full" size="lg">
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
								<ArrowRightIcon className="ml-1 size-4" />
							</Button>
						)}
					</>
				)}

				{(permit2.approveError || swap.error) && (
					<p className="rounded-md bg-red-500/10 px-3 py-2 text-xs text-red-400">
						{formatErrorMessage(permit2.approveError ?? swap.error)}
					</p>
				)}
			</CardContent>

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
		</Card>
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
			className="flex shrink-0 items-center gap-2 rounded-full border border-border-subtle bg-surface-card px-3 py-1.5 text-sm font-medium text-steel-white transition-colors hover:border-indigo/40"
		>
			{token ? token.symbol : placeholder}
		</button>
	);
}
