"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { ChevronDownIcon, ChevronUpIcon, WalletIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { formatUnits, parseUnits } from "viem";
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TransactionStatus } from "@/components/ui/transaction-status";
import { useBuyToken } from "@/hooks/use-buy-token";
import { useSellToken } from "@/hooks/use-sell-token";
import { useTransactionEffects } from "@/hooks/use-transaction-effects";
import { useUsdcApproval } from "@/hooks/use-usdc-approval";
import { useUsdcBalance } from "@/hooks/use-usdc-balance";
import { FORJA_LAUNCHPAD_ADDRESS, TIP20_DECIMALS } from "@/lib/constants";
import { erc20Abi, launchpadConfig } from "@/lib/contracts";
import { deriveTxState, formatErrorMessage } from "@/lib/format";
import { cn } from "@/lib/utils";

const SLIPPAGE_OPTIONS = [0.5, 1, 3] as const;
const PRESETS = [
	{ label: "25%", fraction: 0.25 },
	{ label: "50%", fraction: 0.5 },
	{ label: "75%", fraction: 0.75 },
	{ label: "MAX", fraction: 1 },
] as const;

const TRADING_FEE_BPS = 100n; // 1%
const CREATOR_SHARE_BPS = 50n; // 0.5%
const PROTOCOL_SHARE_BPS = 50n; // 0.5%

interface TradePanelProps {
	onChainLaunchId: string;
	tokenAddress: string;
	tokenSymbol: string;
	graduated: boolean;
	killed: boolean;
	failed: boolean;
	onTradeSuccess: () => void;
}

function formatAmount(raw: bigint, decimals = TIP20_DECIMALS): string {
	const n = Number(formatUnits(raw, decimals));
	return n.toLocaleString("en-US", { maximumFractionDigits: n >= 1 ? 4 : 6 });
}

export function TradePanel({
	onChainLaunchId,
	tokenAddress,
	tokenSymbol,
	graduated,
	killed,
	failed,
	onTradeSuccess,
}: TradePanelProps) {
	const { isConnected, address } = useAccount();
	const [tab, setTab] = useState<"buy" | "sell">("buy");
	const [buyAmount, setBuyAmount] = useState("");
	const [sellAmount, setSellAmount] = useState("");
	const [slippage, setSlippage] = useState(1);
	const [feeOpen, setFeeOpen] = useState(false);
	const [buyDialogOpen, setBuyDialogOpen] = useState(false);
	const [sellDialogOpen, setSellDialogOpen] = useState(false);

	const sellOnly = killed || failed;
	const isDisabled = graduated;
	const tokenAddr = tokenAddress as `0x${string}`;

	// USDC balance for buy
	const { balance: usdcBalance } = useUsdcBalance();

	// Token balance for sell
	const { data: tokenBalance } = useReadContract({
		address: tokenAddr,
		abi: erc20Abi,
		functionName: "balanceOf",
		args: address ? [address] : undefined,
		query: { enabled: !!address },
	});

	// Spot price for impact calculation
	const { data: spotPrice } = useReadContract({
		...launchpadConfig,
		functionName: "getCurrentPrice",
		args: [BigInt(onChainLaunchId)],
		query: { enabled: !isDisabled },
	});

	// Buy quote
	const buyAmountRaw = buyAmount ? parseUnits(buyAmount, TIP20_DECIMALS) : 0n;
	const { data: buyQuote } = useReadContract({
		...launchpadConfig,
		functionName: "calculateBuyReturn",
		args: [BigInt(onChainLaunchId), buyAmountRaw],
		query: { enabled: buyAmountRaw > 0n && !isDisabled && !sellOnly },
	});

	// Sell quote (also works on killed/failed launches — contract allows sells)
	const sellAmountRaw = sellAmount ? parseUnits(sellAmount, TIP20_DECIMALS) : 0n;
	const { data: sellQuote } = useReadContract({
		...launchpadConfig,
		functionName: "calculateSellReturn",
		args: [BigInt(onChainLaunchId), sellAmountRaw],
		query: { enabled: sellAmountRaw > 0n && !isDisabled },
	});

	// Price impact calculations
	const buyPriceImpact = useMemo(() => {
		if (!spotPrice || spotPrice === 0n || !buyQuote || buyQuote === 0n || buyAmountRaw <= 0n)
			return 0;
		const executionPrice = (buyAmountRaw * 1_000_000n) / buyQuote;
		const diff =
			executionPrice > spotPrice ? executionPrice - spotPrice : spotPrice - executionPrice;
		return Number((diff * 10000n) / spotPrice) / 100;
	}, [spotPrice, buyQuote, buyAmountRaw]);

	const sellPriceImpact = useMemo(() => {
		if (!spotPrice || spotPrice === 0n || !sellQuote || sellQuote === 0n || sellAmountRaw <= 0n)
			return 0;
		const executionPrice = (sellQuote * 1_000_000n) / sellAmountRaw;
		const diff =
			spotPrice > executionPrice ? spotPrice - executionPrice : executionPrice - spotPrice;
		return Number((diff * 10000n) / spotPrice) / 100;
	}, [spotPrice, sellQuote, sellAmountRaw]);

	// Fee breakdown (1% of USDC side)
	const buyFees = useMemo(() => {
		if (buyAmountRaw === 0n) return null;
		const total = (buyAmountRaw * TRADING_FEE_BPS) / 10000n;
		const creator = (buyAmountRaw * CREATOR_SHARE_BPS) / 10000n;
		const protocol = (buyAmountRaw * PROTOCOL_SHARE_BPS) / 10000n;
		return { total, creator, protocol };
	}, [buyAmountRaw]);

	const sellFees = useMemo(() => {
		if (!sellQuote || sellQuote === 0n) return null;
		// Sell quote is NET of fees; approximate fee from gross
		const gross = (sellQuote * 10000n) / (10000n - TRADING_FEE_BPS);
		const total = gross - sellQuote;
		const creator = (gross * CREATOR_SHARE_BPS) / 10000n;
		const protocol = (gross * PROTOCOL_SHARE_BPS) / 10000n;
		return { total, creator, protocol };
	}, [sellQuote]);

	// ─── Buy: USDC Approval ───
	const {
		needsApproval: needsBuyApproval,
		approve: approveBuy,
		isApproving: isBuyApproving,
		isApprovalConfirming: isBuyApprovalConfirming,
		isApprovalConfirmed: isBuyApprovalConfirmed,
		approveError: buyApproveError,
	} = useUsdcApproval({ spender: FORJA_LAUNCHPAD_ADDRESS, amount: buyAmountRaw });

	// ─── Sell: Token Approval (inline, not useUsdcApproval) ───
	const { data: tokenAllowance, refetch: refetchTokenAllowance } = useReadContract({
		address: tokenAddr,
		abi: erc20Abi,
		functionName: "allowance",
		args: address ? [address, FORJA_LAUNCHPAD_ADDRESS] : undefined,
		query: { enabled: !!address },
	});

	const {
		writeContract: writeTokenApprove,
		data: tokenApproveHash,
		isPending: isTokenApproving,
		error: tokenApproveError,
	} = useWriteContract();

	const { isLoading: isTokenApprovalConfirming, isSuccess: isTokenApprovalConfirmed } =
		useWaitForTransactionReceipt({ hash: tokenApproveHash });

	useEffect(() => {
		if (isTokenApprovalConfirmed) refetchTokenAllowance();
	}, [isTokenApprovalConfirmed, refetchTokenAllowance]);

	const needsSellApproval = tokenAllowance !== undefined && tokenAllowance < sellAmountRaw;

	const approveSellToken = useCallback(() => {
		writeTokenApprove({
			address: tokenAddr,
			abi: erc20Abi,
			functionName: "approve",
			args: [FORJA_LAUNCHPAD_ADDRESS, sellAmountRaw],
		});
	}, [writeTokenApprove, tokenAddr, sellAmountRaw]);

	// ─── Buy hook ───
	const {
		buy,
		isBuying,
		isConfirming: isBuyConfirming,
		isSuccess: isBuySuccess,
		txHash: buyTxHash,
		error: buyError,
		reset: resetBuy,
	} = useBuyToken();

	// ─── Sell hook ───
	const {
		sell,
		isSelling,
		isConfirming: isSellConfirming,
		isSuccess: isSellSuccess,
		txHash: sellTxHash,
		error: sellError,
		reset: resetSell,
	} = useSellToken();

	const buyTxState = deriveTxState(isBuying, isBuyConfirming, isBuySuccess, buyError);
	const sellTxState = deriveTxState(isSelling, isSellConfirming, isSellSuccess, sellError);

	useTransactionEffects({
		txHash: buyTxHash,
		isConfirming: isBuyConfirming,
		isSuccess: isBuySuccess,
		error: buyError,
		showConfirmedToast: true,
	});

	useTransactionEffects({
		txHash: sellTxHash,
		isConfirming: isSellConfirming,
		isSuccess: isSellSuccess,
		error: sellError,
		showConfirmedToast: true,
	});

	useEffect(() => {
		if (isBuySuccess || isSellSuccess) {
			onTradeSuccess();
			setBuyAmount("");
			setSellAmount("");
		}
	}, [isBuySuccess, isSellSuccess, onTradeSuccess]);

	const applyBuyPreset = useCallback(
		(fraction: number) => {
			if (usdcBalance === undefined) return;
			const raw =
				fraction >= 1 ? usdcBalance : (usdcBalance * BigInt(Math.round(fraction * 10000))) / 10000n;
			setBuyAmount(formatUnits(raw, TIP20_DECIMALS));
		},
		[usdcBalance],
	);

	const applySellPreset = useCallback(
		(fraction: number) => {
			if (tokenBalance === undefined) return;
			const raw =
				fraction >= 1
					? (tokenBalance as bigint)
					: ((tokenBalance as bigint) * BigInt(Math.round(fraction * 10000))) / 10000n;
			setSellAmount(formatUnits(raw, TIP20_DECIMALS));
		},
		[tokenBalance],
	);

	const handleBuyDialogClose = useCallback(
		(open: boolean) => {
			if (!open) {
				setBuyDialogOpen(false);
				if (buyError) resetBuy();
			}
		},
		[buyError, resetBuy],
	);

	const handleSellDialogClose = useCallback(
		(open: boolean) => {
			if (!open) {
				setSellDialogOpen(false);
				if (sellError) resetSell();
			}
		},
		[sellError, resetSell],
	);

	const handleBuy = useCallback(() => {
		if (!buyQuote || buyAmountRaw <= 0n) return;
		setBuyDialogOpen(true);
		const minTokensOut = (buyQuote * BigInt(Math.floor((100 - slippage) * 100))) / 10000n;
		buy(BigInt(onChainLaunchId), buyAmountRaw, minTokensOut);
	}, [buy, onChainLaunchId, buyAmountRaw, buyQuote, slippage]);

	const handleSell = useCallback(() => {
		if (!sellQuote || sellAmountRaw <= 0n) return;
		setSellDialogOpen(true);
		const minUsdcOut = (sellQuote * BigInt(Math.floor((100 - slippage) * 100))) / 10000n;
		sell(BigInt(onChainLaunchId), sellAmountRaw, minUsdcOut);
	}, [sell, onChainLaunchId, sellAmountRaw, sellQuote, slippage]);

	if (!isConnected) {
		return (
			<Card className="border-anvil-gray-light bg-deep-charcoal">
				<CardContent className="flex flex-col items-center gap-4 p-6">
					<WalletIcon className="size-8 text-smoke-dark" />
					<p className="text-sm text-smoke-dark">Connect wallet to trade</p>
					<ConnectButton />
				</CardContent>
			</Card>
		);
	}

	if (isDisabled) {
		return (
			<Card className="border-anvil-gray-light bg-deep-charcoal">
				<CardContent className="p-6 text-center">
					<p className="text-sm text-smoke-dark">This token has graduated to Uniswap v4.</p>
				</CardContent>
			</Card>
		);
	}

	// For killed/failed launches, force sell tab
	const effectiveTab = sellOnly ? "sell" : tab;

	return (
		<Card className="border-anvil-gray-light bg-deep-charcoal">
			<CardHeader className="pb-2">
				<CardTitle className="text-sm text-steel-white">
					{sellOnly ? "Exit Position" : "Trade"}
				</CardTitle>
				{sellOnly && (
					<p className="text-xs text-red-400/80">
						This launch is no longer active. You can sell your tokens to exit.
					</p>
				)}
			</CardHeader>
			<CardContent>
				<Tabs value={effectiveTab} onValueChange={(v) => !sellOnly && setTab(v as "buy" | "sell")}>
					{!sellOnly && (
						<TabsList className="w-full border-b border-anvil-gray-light bg-transparent">
							<TabsTrigger
								value="buy"
								className="flex-1 text-smoke data-[state=active]:text-emerald-400"
							>
								Buy
							</TabsTrigger>
							<TabsTrigger
								value="sell"
								className="flex-1 text-smoke data-[state=active]:text-red-400"
							>
								Sell
							</TabsTrigger>
						</TabsList>
					)}

					<TabsContent value="buy" className="mt-4 space-y-4">
						<BalanceDisplay
							label="Your Balance"
							value={usdcBalance !== undefined ? `${formatAmount(usdcBalance)} USDC` : "—"}
						/>

						<div className="space-y-2">
							<label htmlFor="buy-usdc-amount" className="text-sm font-medium text-smoke">
								USDC Amount
							</label>
							<Input
								id="buy-usdc-amount"
								type="number"
								inputMode="decimal"
								placeholder="0.00"
								value={buyAmount}
								onChange={(e) => {
									setBuyAmount(e.target.value);
									resetBuy();
								}}
								min="0"
								step="1"
								className="border-anvil-gray-light bg-obsidian-black/50 text-smoke"
							/>
							<PresetRow
								onPreset={applyBuyPreset}
								disabled={usdcBalance === undefined || usdcBalance === 0n}
							/>
						</div>

						{buyQuote !== undefined && buyAmountRaw > 0n && (
							<div className="rounded-lg border border-anvil-gray-light bg-obsidian-black/30 p-3">
								<div className="flex items-center justify-between text-xs text-smoke-dark">
									<span>You receive</span>
									<span className="font-mono text-sm text-steel-white">
										~{formatAmount(buyQuote)} {tokenSymbol}
									</span>
								</div>
							</div>
						)}

						{buyFees && (
							<FeeBreakdown
								open={feeOpen}
								onToggle={() => setFeeOpen((v) => !v)}
								total={buyFees.total}
								creator={buyFees.creator}
								protocol={buyFees.protocol}
								currency="USDC"
							/>
						)}

						<PriceImpactWarning impact={buyPriceImpact} />

						<SlippageSelector value={slippage} onChange={setSlippage} />

						{buyApproveError && (
							<p className="text-xs text-red-400">{formatErrorMessage(buyApproveError)}</p>
						)}
						{buyError && <p className="text-xs text-red-400">{formatErrorMessage(buyError)}</p>}

						{needsBuyApproval && !isBuyApprovalConfirmed ? (
							<Button
								className="w-full bg-emerald-500 text-white hover:bg-emerald-600"
								disabled={buyAmountRaw <= 0n || isBuyApproving || isBuyApprovalConfirming}
								onClick={approveBuy}
							>
								{isBuyApproving || isBuyApprovalConfirming ? "Approving..." : "Approve USDC"}
							</Button>
						) : (
							<Button
								className="w-full bg-emerald-500 text-white hover:bg-emerald-600"
								disabled={buyAmountRaw <= 0n || !buyQuote || isBuying || isBuyConfirming}
								onClick={handleBuy}
							>
								{isBuying || isBuyConfirming ? "Buying..." : "Buy"}
							</Button>
						)}

						<TransactionStatus
							open={buyDialogOpen && buyTxState !== "idle"}
							onOpenChange={handleBuyDialogClose}
							state={buyTxState}
							txHash={buyTxHash}
							title="Buy Token"
						/>
					</TabsContent>

					<TabsContent value="sell" className="mt-4 space-y-4">
						<BalanceDisplay
							label="Your Balance"
							value={
								tokenBalance !== undefined
									? `${formatAmount(tokenBalance as bigint)} ${tokenSymbol}`
									: "—"
							}
						/>

						<div className="space-y-2">
							<label htmlFor="sell-token-amount" className="text-sm font-medium text-smoke">
								{tokenSymbol} Amount
							</label>
							<Input
								id="sell-token-amount"
								type="number"
								inputMode="decimal"
								placeholder="0"
								value={sellAmount}
								onChange={(e) => {
									setSellAmount(e.target.value);
									resetSell();
								}}
								min="0"
								className="border-anvil-gray-light bg-obsidian-black/50 text-smoke"
							/>
							<PresetRow
								onPreset={applySellPreset}
								disabled={tokenBalance === undefined || (tokenBalance as bigint) === 0n}
							/>
						</div>

						{sellQuote !== undefined && sellAmountRaw > 0n && (
							<div className="rounded-lg border border-anvil-gray-light bg-obsidian-black/30 p-3">
								<div className="flex items-center justify-between text-xs text-smoke-dark">
									<span>You receive</span>
									<span className="font-mono text-sm text-steel-white">
										~${formatAmount(sellQuote)} USDC
									</span>
								</div>
							</div>
						)}

						{sellFees && (
							<FeeBreakdown
								open={feeOpen}
								onToggle={() => setFeeOpen((v) => !v)}
								total={sellFees.total}
								creator={sellFees.creator}
								protocol={sellFees.protocol}
								currency="USDC"
							/>
						)}

						<PriceImpactWarning impact={sellPriceImpact} />

						<SlippageSelector value={slippage} onChange={setSlippage} />

						{tokenApproveError && (
							<p className="text-xs text-red-400">{formatErrorMessage(tokenApproveError)}</p>
						)}
						{sellError && <p className="text-xs text-red-400">{formatErrorMessage(sellError)}</p>}

						{needsSellApproval && !isTokenApprovalConfirmed ? (
							<Button
								className="w-full bg-red-500 text-white hover:bg-red-600"
								disabled={sellAmountRaw <= 0n || isTokenApproving || isTokenApprovalConfirming}
								onClick={approveSellToken}
							>
								{isTokenApproving || isTokenApprovalConfirming
									? "Approving..."
									: `Approve ${tokenSymbol}`}
							</Button>
						) : (
							<Button
								className="w-full bg-red-500 text-white hover:bg-red-600"
								disabled={sellAmountRaw <= 0n || !sellQuote || isSelling || isSellConfirming}
								onClick={handleSell}
							>
								{isSelling || isSellConfirming ? "Selling..." : "Sell"}
							</Button>
						)}

						<TransactionStatus
							open={sellDialogOpen && sellTxState !== "idle"}
							onOpenChange={handleSellDialogClose}
							state={sellTxState}
							txHash={sellTxHash}
							title="Sell Token"
						/>
					</TabsContent>
				</Tabs>
			</CardContent>
		</Card>
	);
}

function BalanceDisplay({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex items-center justify-between rounded-md bg-obsidian-black/40 px-3 py-2">
			<span className="text-xs text-smoke-dark">{label}</span>
			<span className="font-mono text-xs text-steel-white">{value}</span>
		</div>
	);
}

function PresetRow({
	onPreset,
	disabled,
}: {
	onPreset: (fraction: number) => void;
	disabled: boolean;
}) {
	return (
		<div className="grid grid-cols-4 gap-1.5">
			{PRESETS.map((preset) => (
				<button
					key={preset.label}
					type="button"
					disabled={disabled}
					onClick={() => onPreset(preset.fraction)}
					className={cn(
						"rounded-md border border-anvil-gray-light px-2 py-1 text-xs font-medium text-smoke transition-colors",
						"hover:border-indigo hover:bg-indigo/10 hover:text-indigo",
						"disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-anvil-gray-light disabled:hover:bg-transparent disabled:hover:text-smoke",
					)}
				>
					{preset.label}
				</button>
			))}
		</div>
	);
}

function FeeBreakdown({
	open,
	onToggle,
	total,
	creator,
	protocol,
	currency,
}: {
	open: boolean;
	onToggle: () => void;
	total: bigint;
	creator: bigint;
	protocol: bigint;
	currency: string;
}) {
	return (
		<div className="rounded-md border border-anvil-gray-light bg-obsidian-black/30">
			<button
				type="button"
				onClick={onToggle}
				className="flex w-full items-center justify-between px-3 py-2 text-xs text-smoke-dark hover:text-smoke"
			>
				<span>
					Fee: ~{formatAmount(total)} {currency} (1%)
				</span>
				{open ? <ChevronUpIcon className="size-3" /> : <ChevronDownIcon className="size-3" />}
			</button>
			{open && (
				<div className="space-y-1 border-t border-anvil-gray-light px-3 py-2 text-xs text-smoke-dark">
					<div className="flex items-center justify-between">
						<span>Creator share (0.5%)</span>
						<span className="font-mono text-smoke">
							{formatAmount(creator)} {currency}
						</span>
					</div>
					<div className="flex items-center justify-between">
						<span>Protocol share (0.5%)</span>
						<span className="font-mono text-smoke">
							{formatAmount(protocol)} {currency}
						</span>
					</div>
				</div>
			)}
		</div>
	);
}

function PriceImpactWarning({ impact }: { impact: number }) {
	if (impact <= 5) return null;
	const isHigh = impact > 15;
	return (
		<div
			className={`rounded p-2 text-xs ${isHigh ? "bg-red-500/10 text-red-400" : "bg-yellow-500/10 text-yellow-400"}`}
		>
			Price impact: {impact.toFixed(2)}% —{" "}
			{isHigh ? "Very high impact, consider a smaller trade" : "Consider a smaller trade"}
		</div>
	);
}

function SlippageSelector({ value, onChange }: { value: number; onChange: (v: number) => void }) {
	return (
		<div className="flex items-center gap-2">
			<span className="text-xs text-smoke-dark">Slippage:</span>
			{SLIPPAGE_OPTIONS.map((opt) => (
				<button
					key={opt}
					type="button"
					onClick={() => onChange(opt)}
					className={cn(
						"rounded px-2 py-1 text-xs transition-colors",
						value === opt ? "bg-indigo/20 text-indigo" : "text-smoke-dark hover:text-smoke",
					)}
				>
					{opt}%
				</button>
			))}
		</div>
	);
}
