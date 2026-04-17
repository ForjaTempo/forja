"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
	ArrowLeftIcon,
	ExternalLinkIcon,
	GlobeIcon,
	MessageCircleIcon,
	RocketIcon,
	SendIcon,
	XIcon as TwitterIcon,
} from "lucide-react";
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
import { CurveChart } from "@/components/launch/curve-chart";
import { GraduationBanner } from "@/components/launch/graduation-banner";
import { GraduationProgress } from "@/components/launch/graduation-progress";
import { LiveTradeFeed } from "@/components/launch/live-trade-feed";
import { TerminatedBanner } from "@/components/launch/terminated-banner";
import { TradePanel } from "@/components/launch/trade-panel";
import { PageContainer } from "@/components/layout/page-container";
import { Badge } from "@/components/ui/badge";
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
							{launch.tags && launch.tags.length > 0 && (
								<div className="mt-2 flex flex-wrap gap-1.5">
									{launch.tags.map((tag) => (
										<Badge key={tag} variant="outline" className="text-xs">
											{tag}
										</Badge>
									))}
								</div>
							)}
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

				<SocialLinksRow launch={launch} />

				{/* State banners */}
				{launch.graduated && (
					<GraduationBanner
						tokenAddress={launch.tokenAddress}
						graduatedAt={launch.graduatedAt}
						totalVolume={launch.totalVolume}
						uniqueTraders={launch.uniqueTraders}
						createdAt={launch.createdAt}
					/>
				)}
				{!launch.graduated && (launch.killed || launch.failed) && (
					<TerminatedBanner reason={launch.killed ? "killed" : "failed"} />
				)}

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

						{/* Bonding Curve Chart */}
						<CurveChart
							realTokensSold={launch.realTokensSold}
							realUsdcRaised={launch.realUsdcRaised}
							graduated={launch.graduated}
						/>

						{/* Stats Row */}
						<div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
							<MiniStat label="Raised" value={`$${formatUsdc(launch.realUsdcRaised)}`} />
							<MiniStat label="Volume" value={`$${formatUsdc(launch.totalVolume)}`} />
							<MiniStat label="Trades" value={launch.tradeCount.toString()} />
							<MiniStat label="Traders" value={launch.uniqueTraders.toString()} />
							<MiniStat label="Holders" value={launch.holderCount.toString()} />
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
										className="font-mono text-right text-indigo hover:underline"
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

						{/* Live Trade Feed */}
						<LiveTradeFeed
							trades={tradesData?.trades ?? []}
							total={tradesData?.total ?? 0}
							isLoading={tradesLoading}
							tokenSymbol={launch.symbol}
						/>
					</div>

					{/* Right Column (1/3) — sticky on desktop */}
					<div id="trade-panel-anchor" className="space-y-6 lg:sticky lg:top-20 lg:self-start">
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
	if (launch.graduated) return <Badge variant="success">Graduated</Badge>;
	if (launch.killed || launch.failed) {
		return <Badge variant="destructive">{launch.killed ? "Killed" : "Failed"}</Badge>;
	}
	return <Badge variant="warning">Live</Badge>;
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

function SocialLinksRow({ launch }: { launch: LaunchDetail }) {
	const { website, twitterHandle, telegramHandle, discordHandle } = launch;
	const hasAny = website || twitterHandle || telegramHandle || discordHandle;
	if (!hasAny) return null;

	const twitterUrl = twitterHandle ? `https://x.com/${twitterHandle}` : null;
	const telegramUrl = telegramHandle
		? telegramHandle.startsWith("http")
			? telegramHandle
			: `https://t.me/${telegramHandle.replace(/^@/, "")}`
		: null;
	const discordUrl = discordHandle
		? discordHandle.startsWith("http")
			? discordHandle
			: `https://discord.gg/${discordHandle}`
		: null;

	return (
		<div className="flex flex-wrap items-center gap-2">
			{website && (
				<SocialLink href={website} label="Website" icon={<GlobeIcon className="size-3.5" />} />
			)}
			{twitterUrl && (
				<SocialLink
					href={twitterUrl}
					label={`@${twitterHandle}`}
					icon={<TwitterIcon className="size-3.5" />}
				/>
			)}
			{telegramUrl && (
				<SocialLink href={telegramUrl} label="Telegram" icon={<SendIcon className="size-3.5" />} />
			)}
			{discordUrl && (
				<SocialLink
					href={discordUrl}
					label="Discord"
					icon={<MessageCircleIcon className="size-3.5" />}
				/>
			)}
		</div>
	);
}

function SocialLink({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
	return (
		<a
			href={href}
			target="_blank"
			rel="noopener noreferrer"
			className="inline-flex items-center gap-1.5 rounded-md border border-anvil-gray-light bg-anvil-gray/30 px-2.5 py-1 text-xs text-smoke transition-colors hover:border-indigo/60 hover:text-indigo"
		>
			{icon}
			{label}
		</a>
	);
}
