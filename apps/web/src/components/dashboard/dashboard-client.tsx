"use client";

import { useQuery } from "@tanstack/react-query";
import { KeyRoundIcon, WalletIcon } from "lucide-react";
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
import { ConnectButton } from "@/components/layout/connect-button";
import { PageContainer } from "@/components/layout/page-container";
import { Button } from "@/components/ui/button";
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
		return (
			<PageContainer className="py-8 sm:py-12">
				<div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
					<WalletIcon className="size-12 text-smoke-dark" />
					<h2 className="text-xl font-semibold text-steel-white">Connect Your Wallet</h2>
					<p className="text-sm text-smoke-dark">
						Connect your wallet to view your creator dashboard
					</p>
					<ConnectButton />
				</div>
			</PageContainer>
		);
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
					<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
						{Array.from({ length: 4 }).map((_, i) => (
							<Skeleton key={`overview-${i.toString()}`} className="h-24 rounded-lg" />
						))}
					</div>
				) : overview ? (
					<DashboardOverview overview={overview} />
				) : (
					<div className="rounded-lg border border-anvil-gray-light bg-obsidian-black/50 p-8 text-center">
						<p className="text-sm text-smoke-dark">No creator activity found for this wallet</p>
					</div>
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
								<div className="rounded-lg border border-anvil-gray-light bg-obsidian-black/50 py-12 text-center">
									<p className="text-sm text-smoke-dark">You haven't created any launches yet</p>
								</div>
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
							<div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-anvil-gray-light bg-obsidian-black/50 py-12">
								<KeyRoundIcon className="size-8 text-smoke-dark" />
								<p className="text-sm text-smoke-dark">
									Sign a message to verify your wallet and view your watchlist
								</p>
								<Button
									onClick={() => requestAuth()}
									className="bg-primary text-primary-foreground hover:bg-primary/90"
								>
									Sign to Verify
								</Button>
							</div>
						) : (
							<WatchlistTab tokens={watchlistTokens} />
						)}
					</TabsContent>
				</Tabs>
			</div>
		</PageContainer>
	);
}
