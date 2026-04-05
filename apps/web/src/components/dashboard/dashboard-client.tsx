"use client";

import { useQuery } from "@tanstack/react-query";
import { WalletIcon } from "lucide-react";
import { useState } from "react";
import { useAccount } from "wagmi";
import { getDashboardOverview, getCreatorTokensWithStats, getUnlockCalendar } from "@/actions/dashboard";
import { getCreatorMultisends, getCreatorLocks } from "@/actions/token-hub";
import { ConnectButton } from "@/components/layout/connect-button";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardOverview } from "./dashboard-overview";
import { LockHistory } from "./lock-history";
import { MultisendHistory } from "./multisend-history";
import { MyTokens } from "./my-tokens";
import { TokenAnalytics } from "./token-analytics";
import { UnlockCalendar } from "./unlock-calendar";

export function DashboardClient() {
	const { address, isConnected } = useAccount();
	const [selectedToken, setSelectedToken] = useState<{
		address: string;
		name: string;
		symbol: string;
	} | null>(null);

	const { data: overview, isLoading: overviewLoading } = useQuery({
		queryKey: ["dashboard-overview", address],
		queryFn: () => getDashboardOverview(address!),
		enabled: isConnected && !!address,
		staleTime: 60_000,
	});

	const { data: tokens = [], isLoading: tokensLoading } = useQuery({
		queryKey: ["creator-tokens-stats", address],
		queryFn: () => getCreatorTokensWithStats(address!),
		enabled: isConnected && !!address,
		staleTime: 60_000,
	});

	const { data: multisends = [] } = useQuery({
		queryKey: ["dashboard-multisends", address],
		queryFn: () => getCreatorMultisends(address!),
		enabled: isConnected && !!address,
		staleTime: 60_000,
	});

	const { data: locks = [] } = useQuery({
		queryKey: ["dashboard-locks", address],
		queryFn: () => getCreatorLocks(address!),
		enabled: isConnected && !!address,
		staleTime: 60_000,
	});

	const { data: unlockEvents = [] } = useQuery({
		queryKey: ["unlock-calendar", address],
		queryFn: () => getUnlockCalendar(address!),
		enabled: isConnected && !!address,
		staleTime: 60_000,
	});

	if (!isConnected) {
		return (
			<PageContainer className="py-8 sm:py-12">
				<div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
					<WalletIcon className="size-12 text-smoke-dark" />
					<h2 className="text-xl font-semibold text-steel-white">Connect Your Wallet</h2>
					<p className="text-sm text-smoke-dark">Connect your wallet to view your creator dashboard</p>
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
						<TabsTrigger value="tokens" className="text-smoke data-[state=active]:text-molten-amber">
							My Tokens ({tokens.length})
						</TabsTrigger>
						<TabsTrigger value="multisends" className="text-smoke data-[state=active]:text-molten-amber">
							Multisends ({multisends.length})
						</TabsTrigger>
						<TabsTrigger value="locks" className="text-smoke data-[state=active]:text-molten-amber">
							Locks ({locks.length})
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
										});
									}
								}}
							/>
						)}
					</TabsContent>

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
				</Tabs>
			</div>
		</PageContainer>
	);
}
