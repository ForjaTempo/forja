"use client";

import { useQuery } from "@tanstack/react-query";
import { CheckIcon, CopyIcon, KeyRoundIcon, RocketIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useAccount } from "wagmi";
import { getCampaignsByCreator } from "@/actions/claims";
import {
	getCreatorTokensWithStats,
	getDashboardOverview,
	getUnlockCalendar,
} from "@/actions/dashboard";
import { getLaunchesByCreator } from "@/actions/launches";
import { getCreatorLocks, getCreatorMultisends } from "@/actions/token-hub";
import { getWatchlist } from "@/actions/watchlist";
import { LaunchCard } from "@/components/launch/launch-card";
import { PageContainer } from "@/components/layout/page-container";
import { useReveal } from "@/components/shared/use-reveal";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthGate } from "@/contexts/auth-context";
import { hasSwap } from "@/lib/constants";
import { hasLaunchpad } from "@/lib/contracts";
import { cn } from "@/lib/utils";
import { ClaimsHistory } from "./claims-history";
import { DashboardOverview } from "./dashboard-overview";
import { LockHistory } from "./lock-history";
import { MultisendHistory } from "./multisend-history";
import { MyTokens } from "./my-tokens";
import { NotConnectedHero } from "./not-connected-hero";
import { SwapsHistory } from "./swaps-history";
import { TokenAnalytics } from "./token-analytics";
import { UnlockCalendar } from "./unlock-calendar";
import { WatchlistTab } from "./watchlist-tab";

type DashboardTab =
	| "tokens"
	| "launches"
	| "multisends"
	| "locks"
	| "claims"
	| "swaps"
	| "watchlist";

export function DashboardClient() {
	useReveal();
	const { address, isConnected } = useAccount();
	const { isAuthed, needsAuth, requestAuth } = useAuthGate();
	const [selectedToken, setSelectedToken] = useState<{
		address: string;
		name: string;
		symbol: string;
		decimals: number;
	} | null>(null);
	const [tab, setTab] = useState<DashboardTab>("tokens");
	const [copied, setCopied] = useState(false);

	const { data: overview, isLoading: overviewLoading } = useQuery({
		queryKey: ["dashboard-overview", address],
		queryFn: () => getDashboardOverview(address as string),
		enabled: isConnected && !!address,
		staleTime: 60_000,
	});

	const { data: tokens = [], isLoading: tokensLoading } = useQuery({
		queryKey: ["creator-tokens-stats", address],
		queryFn: () => getCreatorTokensWithStats(address as string),
		enabled: isConnected && !!address,
		staleTime: 60_000,
	});

	const { data: multisends = [] } = useQuery({
		queryKey: ["dashboard-multisends", address],
		queryFn: () => getCreatorMultisends(address as string),
		enabled: isConnected && !!address,
		staleTime: 60_000,
	});

	const { data: locks = [] } = useQuery({
		queryKey: ["dashboard-locks", address],
		queryFn: () => getCreatorLocks(address as string),
		enabled: isConnected && !!address,
		staleTime: 60_000,
	});

	const { data: unlockEvents = [] } = useQuery({
		queryKey: ["unlock-calendar", address],
		queryFn: () => getUnlockCalendar(address as string),
		enabled: isConnected && !!address,
		staleTime: 60_000,
	});

	const { data: claims = [] } = useQuery({
		queryKey: ["dashboard-claims", address],
		queryFn: () => getCampaignsByCreator(address as string),
		enabled: isConnected && !!address,
		staleTime: 60_000,
	});

	const { data: myLaunches = [] } = useQuery({
		queryKey: ["dashboard-launches", address],
		queryFn: () => getLaunchesByCreator(address as string),
		enabled: isConnected && !!address && hasLaunchpad,
		staleTime: 60_000,
	});

	const { data: watchlistTokens = [] } = useQuery({
		queryKey: ["watchlist", address],
		queryFn: () => getWatchlist(address as string),
		enabled: isConnected && !!address && isAuthed,
		staleTime: 60_000,
	});

	if (!isConnected) {
		return <NotConnectedHero />;
	}

	if (selectedToken) {
		return (
			<PageContainer className="py-8 sm:py-12">
				<TokenAnalytics
					tokenAddress={selectedToken.address}
					tokenName={selectedToken.name}
					tokenSymbol={selectedToken.symbol}
					tokenDecimals={selectedToken.decimals}
					onBack={() => setSelectedToken(null)}
				/>
			</PageContainer>
		);
	}

	const copyAddress = async () => {
		if (!address) return;
		try {
			await navigator.clipboard.writeText(address);
			setCopied(true);
			setTimeout(() => setCopied(false), 1500);
		} catch {
			// ignore
		}
	};

	const shortAddress = address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "";

	const tabs: { value: DashboardTab; label: string; count: number; show: boolean }[] = [
		{ value: "tokens", label: "My Tokens", count: tokens.length, show: true },
		{ value: "launches", label: "Launches", count: myLaunches.length, show: hasLaunchpad },
		{ value: "multisends", label: "Multisends", count: multisends.length, show: true },
		{ value: "locks", label: "Locks", count: locks.length, show: true },
		{ value: "claims", label: "Claims", count: claims.length, show: true },
		{ value: "swaps", label: "Swaps", count: 0, show: hasSwap },
		{ value: "watchlist", label: "Watchlist", count: watchlistTokens.length, show: true },
	];

	return (
		<PageContainer className="py-16 sm:py-20 lg:py-24">
			<div className="space-y-10">
				{/* Hero: eyebrow + serif headline + wallet chip */}
				<div className="reveal flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
					<div>
						<div className="mb-4 inline-flex items-center gap-2.5 rounded-full border border-[rgba(129,140,248,0.2)] bg-[rgba(129,140,248,0.08)] py-1 pl-1 pr-3 text-xs text-indigo">
							<span className="rounded-sm bg-indigo px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-[0.08em] text-[#0b0b1a]">
								/YOU
							</span>
							Creator dashboard
						</div>
						<h1
							className="m-0 font-display font-normal leading-[0.95] tracking-[-0.035em]"
							style={{ fontSize: "clamp(40px, 6vw, 72px)" }}
						>
							Welcome back,
							<br />
							<span className="gold-text italic">forger.</span>
						</h1>
					</div>
					{address && (
						<button
							type="button"
							onClick={copyAddress}
							className="inline-flex items-center gap-2.5 self-start rounded-[10px] border border-border-hair bg-bg-elevated px-3.5 py-2.5 font-mono text-[13px] transition-colors hover:border-border-subtle lg:self-auto"
							title="Copy wallet address"
						>
							<span
								className="block size-2 rounded-full bg-green shadow-[0_0_8px_var(--color-green)]"
								aria-hidden
							/>
							<span className="text-text-secondary">{shortAddress}</span>
							<span className="text-text-tertiary">·</span>
							<span className="inline-flex items-center gap-1 text-gold">
								{copied ? (
									<>
										<CheckIcon className="size-3" />
										Copied
									</>
								) : (
									<>
										<CopyIcon className="size-3" />
										Copy
									</>
								)}
							</span>
						</button>
					)}
				</div>

				{/* Portfolio hero card */}
				{overviewLoading ? (
					<div className="space-y-4">
						<Skeleton className="h-72 rounded-3xl" />
					</div>
				) : overview ? (
					<DashboardOverview overview={overview} address={address as string} />
				) : (
					<EmptyState
						icon={<RocketIcon className="size-8" />}
						title="No creator activity yet"
						description="Create your first token, launch, multisend, or lock to see stats here."
						action={
							<Link href="/create">
								<Button
									className="inline-flex items-center gap-2.5 rounded-xl px-6 py-3.5 font-semibold text-[15px] text-[#1a1307] transition-transform hover:-translate-y-0.5"
									style={{
										background: "linear-gradient(135deg, #ffe5a8, #f0d38a 50%, #e8b860)",
										boxShadow:
											"0 4px 30px rgba(240,211,138,0.3), inset 0 1px 0 rgba(255,255,255,0.5)",
									}}
								>
									Create a Token
								</Button>
							</Link>
						}
					/>
				)}

				{/* Pill-group tabs */}
				<div className="reveal">
					<div className="flex flex-wrap gap-1.5 rounded-xl border border-border-hair bg-bg-elevated p-1">
						{tabs
							.filter((t) => t.show)
							.map((t) => {
								const active = tab === t.value;
								return (
									<button
										key={t.value}
										type="button"
										onClick={() => setTab(t.value)}
										className={cn(
											"rounded-lg px-4 py-2 text-sm font-medium transition-colors",
											active
												? "bg-bg-card text-text-primary"
												: "text-text-secondary hover:text-text-primary",
										)}
									>
										{t.label}
										{t.value !== "swaps" && (
											<span className="ml-1.5 font-mono text-[11px] text-text-tertiary">
												{t.count}
											</span>
										)}
									</button>
								);
							})}
					</div>
				</div>

				{/* Tab panels */}
				<div className="reveal">
					{tab === "tokens" &&
						(tokensLoading ? (
							<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
								{Array.from({ length: 3 }).map((_, i) => (
									<Skeleton key={`token-${i.toString()}`} className="h-40 rounded-2xl" />
								))}
							</div>
						) : (
							<MyTokens
								tokens={tokens}
								onSelectToken={(addr) => {
									const token = tokens.find((x) => x.address === addr);
									if (token) {
										setSelectedToken({
											address: addr,
											name: token.name,
											symbol: token.symbol,
											decimals: token.decimals,
										});
									}
								}}
							/>
						))}

					{tab === "launches" &&
						hasLaunchpad &&
						(myLaunches.length === 0 ? (
							<EmptyState
								icon={<RocketIcon className="size-8" />}
								title="No launches yet"
								description="Launch a token with a bonding curve and automatic Uniswap v4 graduation."
								action={
									<Link href="/launch/create">
										<Button variant="outline" className="border-border-subtle">
											Create a Launch
										</Button>
									</Link>
								}
							/>
						) : (
							<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
								{myLaunches.map((launch) => (
									<LaunchCard key={launch.id} launch={launch} />
								))}
							</div>
						))}

					{tab === "multisends" && <MultisendHistory multisends={multisends} />}

					{tab === "locks" && (
						<div>
							<LockHistory locks={locks} />
							{unlockEvents.length > 0 && (
								<div className="mt-8">
									<UnlockCalendar events={unlockEvents} />
								</div>
							)}
						</div>
					)}

					{tab === "claims" && <ClaimsHistory campaigns={claims} />}

					{tab === "swaps" && hasSwap && <SwapsHistory />}

					{tab === "watchlist" &&
						(needsAuth ? (
							<EmptyState
								icon={<KeyRoundIcon className="size-8" />}
								title="Verify to view your watchlist"
								description="Sign a one-time message to prove wallet ownership. We don't send a transaction."
								action={
									<Button
										onClick={() => requestAuth()}
										className="inline-flex items-center gap-2.5 rounded-xl px-6 py-3.5 font-semibold text-[15px] text-[#1a1307] transition-transform hover:-translate-y-0.5"
										style={{
											background: "linear-gradient(135deg, #ffe5a8, #f0d38a 50%, #e8b860)",
											boxShadow:
												"0 4px 30px rgba(240,211,138,0.3), inset 0 1px 0 rgba(255,255,255,0.5)",
										}}
									>
										Sign to Verify
									</Button>
								}
							/>
						) : (
							<WatchlistTab tokens={watchlistTokens} />
						))}
				</div>
			</div>
		</PageContainer>
	);
}
