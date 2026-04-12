"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { WalletIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
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

const SLIPPAGE_OPTIONS = [0.5, 1, 3] as const;

interface TradePanelProps {
	onChainLaunchId: string;
	tokenAddress: string;
	tokenSymbol: string;
	graduated: boolean;
	killed: boolean;
	failed: boolean;
	onTradeSuccess: () => void;
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
						<div className="space-y-2">
							<div className="flex items-center justify-between">
								<label htmlFor="buy-usdc-amount" className="text-sm font-medium text-smoke">
									USDC Amount
								</label>
								{usdcBalance !== undefined && (
									<button
										type="button"
										onClick={() => setBuyAmount(formatUnits(usdcBalance, TIP20_DECIMALS))}
										className="text-xs text-molten-amber hover:underline"
									>
										MAX: {Number(formatUnits(usdcBalance, TIP20_DECIMALS)).toLocaleString()}
									</button>
								)}
							</div>
							<Input
								id="buy-usdc-amount"
								type="number"
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
						</div>

						{buyQuote !== undefined && buyAmountRaw > 0n && (
							<div className="rounded-lg bg-obsidian-black/30 p-3 text-xs text-smoke-dark">
								<p>
									You receive: ~{Number(formatUnits(buyQuote, TIP20_DECIMALS)).toLocaleString()}{" "}
									{tokenSymbol}
								</p>
							</div>
						)}

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
						<div className="space-y-2">
							<div className="flex items-center justify-between">
								<label htmlFor="sell-token-amount" className="text-sm font-medium text-smoke">
									{tokenSymbol} Amount
								</label>
								{tokenBalance !== undefined && (
									<button
										type="button"
										onClick={() => setSellAmount(formatUnits(tokenBalance, TIP20_DECIMALS))}
										className="text-xs text-molten-amber hover:underline"
									>
										MAX: {Number(formatUnits(tokenBalance, TIP20_DECIMALS)).toLocaleString()}
									</button>
								)}
							</div>
							<Input
								id="sell-token-amount"
								type="number"
								placeholder="0"
								value={sellAmount}
								onChange={(e) => {
									setSellAmount(e.target.value);
									resetSell();
								}}
								min="0"
								className="border-anvil-gray-light bg-obsidian-black/50 text-smoke"
							/>
						</div>

						{sellQuote !== undefined && sellAmountRaw > 0n && (
							<div className="rounded-lg bg-obsidian-black/30 p-3 text-xs text-smoke-dark">
								<p>
									You receive: ~${Number(formatUnits(sellQuote, TIP20_DECIMALS)).toLocaleString()}{" "}
									USDC
								</p>
							</div>
						)}

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

function SlippageSelector({ value, onChange }: { value: number; onChange: (v: number) => void }) {
	return (
		<div className="flex items-center gap-2">
			<span className="text-xs text-smoke-dark">Slippage:</span>
			{SLIPPAGE_OPTIONS.map((opt) => (
				<button
					key={opt}
					type="button"
					onClick={() => onChange(opt)}
					className={`rounded px-2 py-1 text-xs ${
						value === opt
							? "bg-molten-amber/20 text-molten-amber"
							: "text-smoke-dark hover:text-smoke"
					}`}
				>
					{opt}%
				</button>
			))}
		</div>
	);
}
