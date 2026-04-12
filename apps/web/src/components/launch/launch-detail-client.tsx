"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftIcon, ExternalLinkIcon, RocketIcon } from "lucide-react";
import Link from "next/link";
import { useCallback } from "react";
import { useAccount, useReadContract } from "wagmi";
import {
	getLaunchDetail,
	getLaunchTrades,
	getUserLaunchPosition,
	type LaunchDetail,
	type LaunchTradeRow,
} from "@/actions/launches";
import { GraduationProgress } from "@/components/launch/graduation-progress";
import { TradeHistory } from "@/components/launch/trade-history";
import { TradePanel } from "@/components/launch/trade-panel";
import { PageContainer } from "@/components/layout/page-container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getExplorerUrl, TEMPO_CHAIN_ID, TIP20_DECIMALS } from "@/lib/constants";
import { erc20Abi } from "@/lib/contracts";
import { formatDate } from "@/lib/format";

function shortenAddress(addr: string): string {
	return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function formatUsdc(raw: string): string {
	const n = Number(BigInt(raw)) / 10 ** TIP20_DECIMALS;
	return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function formatTokens(raw: string): string {
	const n = Number(BigInt(raw)) / 10 ** TIP20_DECIMALS;
	if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
	if (n >= 1_000) return `${(n / 1_000).toFixed(2)}K`;
	return n.toFixed(2);
}

interface Props {
	initialLaunch: LaunchDetail;
	initialTrades: { trades: LaunchTradeRow[]; total: number };
}

export function LaunchDetailClient({ initialLaunch, initialTrades }: Props) {
	const { address } = useAccount();
	const queryClient = useQueryClient();
	const explorerUrl = getExplorerUrl(TEMPO_CHAIN_ID);

	const { data: launch } = useQuery({
		queryKey: ["launch-detail", initialLaunch.id],
		queryFn: () => getLaunchDetail(initialLaunch.id),
		initialData: initialLaunch,
		refetchInterval: 5_000,
	});

	const { data: tradesData, isLoading: tradesLoading } = useQuery({
		queryKey: ["launch-trades", initialLaunch.id],
		queryFn: () => getLaunchTrades(initialLaunch.id, { limit: 20 }),
		initialData: initialTrades,
		refetchInterval: 10_000,
	});

	const { data: position } = useQuery({
		queryKey: ["launch-position", initialLaunch.id, address],
		queryFn: () => getUserLaunchPosition(initialLaunch.id, address as string),
		enabled: !!address,
		staleTime: 10_000,
	});

	// On-chain token balance — accurate even if user received/sent tokens externally
	const { data: onChainBalance } = useReadContract({
		address: initialLaunch.tokenAddress as `0x${string}`,
		abi: erc20Abi,
		functionName: "balanceOf",
		args: address ? [address] : undefined,
		query: { enabled: !!address },
	});

	const handleTradeSuccess = useCallback(() => {
		queryClient.invalidateQueries({ queryKey: ["launch-detail", initialLaunch.id] });
		queryClient.invalidateQueries({ queryKey: ["launch-trades", initialLaunch.id] });
		queryClient.invalidateQueries({ queryKey: ["launch-position", initialLaunch.id] });
	}, [queryClient, initialLaunch.id]);

	if (!launch) return null;

	return (
		<PageContainer className="py-8 sm:py-12">
			<div className="space-y-6">
				{/* Back link */}
				<Link
					href="/launch"
					className="inline-flex items-center gap-1 text-sm text-smoke-dark hover:text-smoke"
				>
					<ArrowLeftIcon className="size-4" />
					All Launches
				</Link>

				{/* Header */}
				<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div className="flex items-center gap-4">
						{launch.imageUri ? (
							// biome-ignore lint/performance/noImgElement: user-provided external URL, no remote pattern config
							<img
								src={launch.imageUri}
								alt={launch.symbol}
								className="size-14 rounded-full object-cover"
							/>
						) : (
							<div className="flex size-14 items-center justify-center rounded-full bg-anvil-gray">
								<RocketIcon className="size-7 text-smoke-dark" />
							</div>
						)}
						<div>
							<div className="flex items-center gap-2">
								<h1 className="text-2xl font-bold text-steel-white">{launch.name}</h1>
								<StatusBadge launch={launch} />
							</div>
							<p className="text-sm text-smoke-dark">
								${launch.symbol}
								{launch.creatorDisplayName && <span> by {launch.creatorDisplayName}</span>}
							</p>
						</div>
					</div>

					<div className="flex gap-2">
						<a
							href={`${explorerUrl}/address/${launch.tokenAddress}`}
							target="_blank"
							rel="noopener noreferrer"
							className="inline-flex items-center gap-1 rounded-md border border-anvil-gray-light px-3 py-2 text-xs text-smoke hover:text-steel-white"
						>
							Token <ExternalLinkIcon className="size-3" />
						</a>
						<a
							href={`${explorerUrl}/tx/${launch.txHash}`}
							target="_blank"
							rel="noopener noreferrer"
							className="inline-flex items-center gap-1 rounded-md border border-anvil-gray-light px-3 py-2 text-xs text-smoke hover:text-steel-white"
						>
							TX <ExternalLinkIcon className="size-3" />
						</a>
					</div>
				</div>

				{/* Main Grid */}
				<div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
					{/* Left Column (2/3) */}
					<div className="space-y-6 lg:col-span-2">
						{/* Description */}
						{launch.description && (
							<Card className="border-anvil-gray-light bg-deep-charcoal">
								<CardContent className="p-4">
									<p className="text-sm text-smoke">{launch.description}</p>
								</CardContent>
							</Card>
						)}

						{/* Stats Row */}
						<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
							<MiniStat label="Raised" value={`$${formatUsdc(launch.realUsdcRaised)}`} />
							<MiniStat label="Volume" value={`$${formatUsdc(launch.totalVolume)}`} />
							<MiniStat label="Trades" value={launch.tradeCount.toString()} />
							<MiniStat label="Traders" value={launch.uniqueTraders.toString()} />
						</div>

						{/* Token Info */}
						<Card className="border-anvil-gray-light bg-deep-charcoal">
							<CardHeader className="pb-2">
								<CardTitle className="text-sm text-steel-white">Token Info</CardTitle>
							</CardHeader>
							<CardContent className="space-y-2 text-xs">
								<InfoRow label="Token Address" value={launch.tokenAddress} mono />
								<div className="flex items-start justify-between gap-4">
									<span className="text-smoke-dark">Creator</span>
									<Link
										href={`/creators/${launch.creatorAddress}`}
										className="font-mono text-right text-molten-amber hover:underline"
									>
										{launch.creatorDisplayName ?? shortenAddress(launch.creatorAddress)}
									</Link>
								</div>
								<InfoRow label="Created" value={formatDate(launch.createdAt)} />
								{launch.graduated && launch.graduatedAt && (
									<InfoRow label="Graduated" value={formatDate(launch.graduatedAt)} />
								)}
								<InfoRow label="Block" value={launch.blockNumber.toString()} />
							</CardContent>
						</Card>

						{/* Trade History */}
						<TradeHistory
							trades={tradesData?.trades ?? []}
							total={tradesData?.total ?? 0}
							isLoading={tradesLoading}
							tokenSymbol={launch.symbol}
						/>
					</div>

					{/* Right Column (1/3) */}
					<div className="space-y-6">
						{/* Graduation Progress */}
						<GraduationProgress
							realUsdcRaised={launch.realUsdcRaised}
							tradeCount={launch.tradeCount}
							uniqueTraders={launch.uniqueTraders}
							graduated={launch.graduated}
						/>

						{/* Trade Panel — shown for active + killed/failed (sell-only exit) */}
						{!launch.graduated && (
							<TradePanel
								onChainLaunchId={launch.launchId}
								tokenAddress={launch.tokenAddress}
								tokenSymbol={launch.symbol}
								graduated={launch.graduated}
								killed={launch.killed}
								failed={launch.failed}
								onTradeSuccess={handleTradeSuccess}
							/>
						)}

						{/* User Position */}
						{(position || onChainBalance !== undefined) && (
							<Card className="border-anvil-gray-light bg-deep-charcoal">
								<CardHeader className="pb-2">
									<CardTitle className="text-sm text-steel-white">Your Position</CardTitle>
								</CardHeader>
								<CardContent className="space-y-2 text-xs">
									{onChainBalance !== undefined && (
										<InfoRow
											label="Balance"
											value={`${formatTokens(onChainBalance.toString())} ${launch.symbol}`}
										/>
									)}
									{position && (
										<>
											<InfoRow
												label="Total Spent"
												value={`$${formatUsdc(position.totalUsdcSpent)}`}
											/>
											<InfoRow
												label="Total Received"
												value={`$${formatUsdc(position.totalUsdcReceived)}`}
											/>
											<InfoRow label="Trades" value={position.tradeCount.toString()} />
										</>
									)}
								</CardContent>
							</Card>
						)}
					</div>
				</div>
			</div>
		</PageContainer>
	);
}

function StatusBadge({ launch }: { launch: LaunchDetail }) {
	if (launch.graduated) {
		return (
			<span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400">
				Graduated
			</span>
		);
	}
	if (launch.killed || launch.failed) {
		return (
			<span className="rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-400">
				{launch.killed ? "Killed" : "Failed"}
			</span>
		);
	}
	return (
		<span className="rounded-full bg-molten-amber/10 px-2 py-0.5 text-xs font-medium text-molten-amber">
			Live
		</span>
	);
}

function MiniStat({ label, value }: { label: string; value: string }) {
	return (
		<div className="rounded-lg border border-anvil-gray-light bg-obsidian-black/50 p-3">
			<p className="text-xs text-smoke-dark">{label}</p>
			<p className="mt-1 text-sm font-semibold text-steel-white">{value}</p>
		</div>
	);
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
	return (
		<div className="flex items-start justify-between gap-4">
			<span className="text-smoke-dark">{label}</span>
			<span className={`text-right text-smoke ${mono ? "font-mono" : ""}`}>
				{mono && value.startsWith("0x") ? shortenAddress(value) : value}
			</span>
		</div>
	);
}
