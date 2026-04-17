"use client";

import { useQuery } from "@tanstack/react-query";
import { KeyRoundIcon, RocketIcon } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthGate } from "@/contexts/auth-context";
import { hasLaunchpad } from "@/lib/contracts";
import { ClaimsHistory } from "./claims-history";
import { DashboardOverview } from "./dashboard-overview";
import { LockHistory } from "./lock-history";
import { MultisendHistory } from "./multisend-history";
import { MyTokens } from "./my-tokens";
import { NotConnectedHero } from "./not-connected-hero";
import { TokenAnalytics } from "./token-analytics";
import { UnlockCalendar } from "./unlock-calendar";
import { WatchlistTab } from "./watchlist-tab";

export function DashboardClient() {
	const { address, isConnected } = useAccount();
	const { isAuthed, needsAuth, requestAuth } = useAuthGate();
	const [selectedToken, setSelectedToken] = useState<{
		address: string;
		name: string;
		symbol: string;
		decimals: number;
	} | null>(null);

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

	return (
		<PageContainer className="py-8 sm:py-12">
			<div className="space-y-8">
				<PageHeader title="Dashboard" description="Track your token performance and activity" />

				{overviewLoading ? (
					<div className="space-y-4">
						<div className="grid gap-4 sm:grid-cols-2">
							<Skeleton className="h-28 rounded-xl" />
							<Skeleton className="h-28 rounded-xl" />
						</div>
						<div className="grid gap-3 sm:grid-cols-3">
							{Array.from({ length: 3 }).map((_, i) => (
								<Skeleton key={`med-${i.toString()}`} className="h-20 rounded-xl" />
							))}
						</div>
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
								<Button className="bg-primary text-primary-foreground hover:bg-primary/90">
									Create a Token
								</Button>
							</Link>
						}
					/>
				)}

				<Tabs defaultValue="tokens">
					<TabsList className="border-b border-anvil-gray-light bg-transparent">
						<TabsTrigger value="tokens" className="text-smoke data-[state=active]:text-indigo">
							My Tokens ({tokens.length})
						</TabsTrigger>
						{hasLaunchpad && (
							<TabsTrigger value="launches" className="text-smoke data-[state=active]:text-indigo">
								Launches ({myLaunches.length})
							</TabsTrigger>
						)}
						<TabsTrigger value="multisends" className="text-smoke data-[state=active]:text-indigo">
							Multisends ({multisends.length})
						</TabsTrigger>
						<TabsTrigger value="locks" className="text-smoke data-[state=active]:text-indigo">
							Locks ({locks.length})
						</TabsTrigger>
						<TabsTrigger value="claims" className="text-smoke data-[state=active]:text-indigo">
							Claims ({claims.length})
						</TabsTrigger>
						<TabsTrigger value="watchlist" className="text-smoke data-[state=active]:text-indigo">
							Watchlist ({watchlistTokens.length})
						</TabsTrigger>
					</TabsList>

					<TabsContent value="tokens" className="mt-6">
						{tokensLoading ? (
							<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
								{Array.from({ length: 3 }).map((_, i) => (
									<Skeleton key={`token-${i.toString()}`} className="h-40 rounded-lg" />
								))}
							</div>
						) : (
							<MyTokens
								tokens={tokens}
								onSelectToken={(addr) => {
									const token = tokens.find((t) => t.address === addr);
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
						)}
					</TabsContent>

					{hasLaunchpad && (
						<TabsContent value="launches" className="mt-6">
							{myLaunches.length === 0 ? (
								<EmptyState
									icon={<RocketIcon className="size-8" />}
									title="No launches yet"
									description="Launch a token with a bonding curve and automatic Uniswap v4 graduation."
									action={
										<Link href="/launch/create">
											<Button variant="outline" className="border-anvil-gray-light">
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
							)}
						</TabsContent>
					)}

					<TabsContent value="multisends" className="mt-6">
						<MultisendHistory multisends={multisends} />
					</TabsContent>

					<TabsContent value="locks" className="mt-6">
						<LockHistory locks={locks} />
						{unlockEvents.length > 0 && (
							<div className="mt-8">
								<UnlockCalendar events={unlockEvents} />
							</div>
						)}
					</TabsContent>

					<TabsContent value="claims" className="mt-6">
						<ClaimsHistory campaigns={claims} />
					</TabsContent>

					<TabsContent value="watchlist" className="mt-6">
						{needsAuth ? (
							<EmptyState
								icon={<KeyRoundIcon className="size-8" />}
								title="Verify to view your watchlist"
								description="Sign a one-time message to prove wallet ownership. We don't send a transaction."
								action={
									<Button
										onClick={() => requestAuth()}
										className="bg-primary text-primary-foreground hover:bg-primary/90"
									>
										Sign to Verify
									</Button>
								}
							/>
						) : (
							<WatchlistTab tokens={watchlistTokens} />
						)}
					</TabsContent>
				</Tabs>
			</div>
		</PageContainer>
	);
}
