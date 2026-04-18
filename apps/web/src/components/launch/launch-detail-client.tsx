"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
	ArrowLeftIcon,
	ExternalLinkIcon,
	GlobeIcon,
	MessageCircleIcon,
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
import { ExternalLinkGuard } from "@/components/shared/external-link-guard";
import { SwapCta } from "@/components/swap/swap-cta";
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
		<main className="relative z-[5] mx-auto max-w-[1400px] px-6 pt-10 pb-20 sm:px-10 sm:pt-14 sm:pb-24">
			<div className="space-y-8">
				{/* Back link */}
				<Link
					href="/launch"
					className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-text-tertiary transition-colors hover:text-text-primary"
				>
					<ArrowLeftIcon className="size-3.5" />
					All launches
				</Link>

				{/* Hero row */}
				<div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
					<div className="flex items-start gap-5">
						{launch.imageUri ? (
							// biome-ignore lint/performance/noImgElement: user-provided external URL, no remote pattern config
							<img
								src={launch.imageUri}
								alt={launch.symbol}
								className="size-16 shrink-0 rounded-2xl object-cover"
								style={{ boxShadow: "0 4px 24px rgba(244,114,182,0.2)" }}
							/>
						) : (
							<div
								className="flex size-16 shrink-0 items-center justify-center rounded-2xl font-display text-xl font-semibold"
								style={{
									background: "linear-gradient(135deg, #f472b6, #a78bfa)",
									color: "#1a0620",
									boxShadow: "0 4px 24px rgba(244,114,182,0.25)",
								}}
							>
								{launch.symbol.slice(0, 2).toUpperCase()}
							</div>
						)}
						<div className="min-w-0">
							<div className="mb-3 flex flex-wrap items-center gap-2">
								<span
									className="inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-[0.12em]"
									style={{
										background: "rgba(244,114,182,0.08)",
										borderColor: "rgba(244,114,182,0.2)",
										color: "#f472b6",
									}}
								>
									${launch.symbol}
								</span>
								<StatusBadge launch={launch} />
							</div>
							<h1
								className="m-0 font-display font-normal leading-[0.98] tracking-[-0.035em] text-text-primary"
								style={{ fontSize: "clamp(36px, 5vw, 56px)" }}
							>
								{launch.name}
							</h1>
							{launch.creatorDisplayName && (
								<p className="mt-3 text-sm text-text-secondary">
									by{" "}
									<Link
										href={`/creators/${launch.creatorAddress}`}
										className="text-text-primary hover:text-indigo"
									>
										{launch.creatorDisplayName}
									</Link>
								</p>
							)}
							{launch.tags && launch.tags.length > 0 && (
								<div className="mt-4 flex flex-wrap gap-1.5">
									{launch.tags.map((tag) => (
										<span
											key={tag}
											className="inline-flex items-center rounded-full bg-bg-elevated px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-text-secondary"
										>
											{tag}
										</span>
									))}
								</div>
							)}
						</div>
					</div>

					<div className="flex shrink-0 flex-wrap gap-2">
						<a
							href={`${explorerUrl}/address/${launch.tokenAddress}`}
							target="_blank"
							rel="noopener noreferrer"
							className="inline-flex items-center gap-1.5 rounded-xl border border-border-hair bg-bg-elevated px-3.5 py-2 font-mono text-[11px] uppercase tracking-[0.12em] text-text-secondary transition-colors hover:border-border-strong hover:text-text-primary"
						>
							Token <ExternalLinkIcon className="size-3" />
						</a>
						<a
							href={`${explorerUrl}/tx/${launch.txHash}`}
							target="_blank"
							rel="noopener noreferrer"
							className="inline-flex items-center gap-1.5 rounded-xl border border-border-hair bg-bg-elevated px-3.5 py-2 font-mono text-[11px] uppercase tracking-[0.12em] text-text-secondary transition-colors hover:border-border-strong hover:text-text-primary"
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
							<div className="rounded-2xl border border-border-hair bg-bg-elevated p-6">
								<div className="mb-3 font-mono text-[11px] uppercase tracking-[0.14em] text-text-tertiary">
									About
								</div>
								<p className="text-[15px] leading-[1.65] text-text-secondary">
									{launch.description}
								</p>
							</div>
						)}

						{/* Bonding Curve Chart */}
						<CurveChart
							realTokensSold={launch.realTokensSold}
							realUsdcRaised={launch.realUsdcRaised}
							graduated={launch.graduated}
						/>

						{/* Stats Row */}
						<div
							className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border-hair sm:grid-cols-5"
							style={{ background: "var(--color-border-hair)" }}
						>
							<MiniStat label="Raised" value={`$${formatUsdc(launch.realUsdcRaised)}`} />
							<MiniStat label="Volume" value={`$${formatUsdc(launch.totalVolume)}`} />
							<MiniStat label="Trades" value={launch.tradeCount.toString()} />
							<MiniStat label="Traders" value={launch.uniqueTraders.toString()} />
							<MiniStat label="Holders" value={launch.holderCount.toString()} />
						</div>

						{/* Token Info */}
						<div className="rounded-2xl border border-border-hair bg-bg-elevated p-6">
							<div className="mb-4 font-mono text-[11px] uppercase tracking-[0.14em] text-text-tertiary">
								Token info
							</div>
							<div className="divide-y divide-border-hair">
								<InfoRow label="Token address" value={launch.tokenAddress} mono />
								<div className="flex items-start justify-between gap-4 py-2.5">
									<span className="font-mono text-[11px] uppercase tracking-[0.12em] text-text-tertiary">
										Creator
									</span>
									<Link
										href={`/creators/${launch.creatorAddress}`}
										className="text-right font-mono text-sm text-indigo hover:underline"
									>
										{launch.creatorDisplayName ?? shortenAddress(launch.creatorAddress)}
									</Link>
								</div>
								<InfoRow label="Created" value={formatDate(launch.createdAt)} />
								{launch.graduated && launch.graduatedAt && (
									<InfoRow label="Graduated" value={formatDate(launch.graduatedAt)} />
								)}
								<InfoRow label="Block" value={launch.blockNumber.toString()} />
							</div>
						</div>

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

						{/* Post-graduation trading flows through the Uniswap v4 router. */}
						{launch.graduated && (
							<div
								className="rounded-2xl border p-5"
								style={{
									borderColor: "rgba(129,140,248,0.3)",
									background: "rgba(129,140,248,0.05)",
								}}
							>
								<div className="mb-3 font-mono text-[11px] uppercase tracking-[0.14em] text-indigo">
									Trade {launch.symbol}
								</div>
								<p className="mb-4 text-xs leading-[1.6] text-text-secondary">
									This launch graduated to Uniswap v4. Trade it through the FORJA swap router — best
									route, transparent 0.25% fee.
								</p>
								<SwapCta tokenAddress={launch.tokenAddress} className="w-full justify-center" />
							</div>
						)}

						{/* User Position */}
						{(position || onChainBalance !== undefined) && (
							<div className="rounded-2xl border border-border-hair bg-bg-elevated p-5">
								<div className="mb-4 font-mono text-[11px] uppercase tracking-[0.14em] text-text-tertiary">
									Your position
								</div>
								<div className="divide-y divide-border-hair">
									{onChainBalance !== undefined && (
										<InfoRow
											label="Balance"
											value={`${formatTokens(onChainBalance.toString())} ${launch.symbol}`}
										/>
									)}
									{position && (
										<>
											<InfoRow
												label="Total spent"
												value={`$${formatUsdc(position.totalUsdcSpent)}`}
											/>
											<InfoRow
												label="Total received"
												value={`$${formatUsdc(position.totalUsdcReceived)}`}
											/>
											<InfoRow label="Trades" value={position.tradeCount.toString()} />
										</>
									)}
								</div>
							</div>
						)}
					</div>
				</div>
			</div>
		</main>
	);
}

function StatusBadge({ launch }: { launch: LaunchDetail }) {
	let label: string;
	let color: string;
	let bg: string;
	let border: string;

	if (launch.graduated) {
		label = "Graduated";
		color = "var(--color-green)";
		bg = "rgba(74,222,128,0.1)";
		border = "rgba(74,222,128,0.25)";
	} else if (launch.killed) {
		label = "Killed";
		color = "var(--color-red)";
		bg = "rgba(248,113,113,0.1)";
		border = "rgba(248,113,113,0.25)";
	} else if (launch.failed) {
		label = "Failed";
		color = "var(--color-red)";
		bg = "rgba(248,113,113,0.1)";
		border = "rgba(248,113,113,0.25)";
	} else {
		label = "Active";
		color = "#f472b6";
		bg = "rgba(244,114,182,0.1)";
		border = "rgba(244,114,182,0.25)";
	}

	return (
		<span
			className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em]"
			style={{ background: bg, borderColor: border, color }}
		>
			<span
				aria-hidden
				className="size-1.5 rounded-full"
				style={{ background: color, boxShadow: `0 0 8px ${color}` }}
			/>
			{label}
		</span>
	);
}

function MiniStat({ label, value }: { label: string; value: string }) {
	return (
		<div className="bg-bg-elevated px-4 py-4">
			<div className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-text-tertiary">
				{label}
			</div>
			<div className="font-display text-[22px] leading-none tracking-[-0.02em] text-text-primary">
				{value}
			</div>
		</div>
	);
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
	return (
		<div className="flex items-start justify-between gap-4 py-2.5">
			<span className="font-mono text-[11px] uppercase tracking-[0.12em] text-text-tertiary">
				{label}
			</span>
			<span className={`text-right text-sm text-text-secondary ${mono ? "font-mono" : ""}`}>
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
				<ExternalLinkGuard
					href={website}
					className="inline-flex items-center gap-1.5 rounded-xl border border-border-hair bg-bg-elevated px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.1em] text-text-secondary transition-colors hover:border-border-strong hover:text-indigo"
				>
					<GlobeIcon className="size-3.5" />
					Website
				</ExternalLinkGuard>
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
			className="inline-flex items-center gap-1.5 rounded-xl border border-border-hair bg-bg-elevated px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.1em] text-text-secondary transition-colors hover:border-border-strong hover:text-indigo"
		>
			{icon}
			{label}
		</a>
	);
}
