"use client";

import type { TokenHubCache, TokenTransfer } from "@forja/db";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { getTokenDetail, getTokenHolderDistribution, getTokenTransfers } from "@/actions/token-hub";
import { getTokenTrustSignals } from "@/actions/trust-signals";
import { PageContainer } from "@/components/layout/page-container";
import { ShareButtons } from "@/components/shared/share-buttons";
import { LiquidityGuidance } from "@/components/token-detail/liquidity-guidance";
import { HolderDistribution } from "@/components/token-hub/holder-distribution";
import { TokenActivity } from "@/components/token-hub/token-activity";
import { TokenOverview } from "@/components/token-hub/token-overview";
import { WatchlistButton } from "@/components/token-hub/watchlist-button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { APP_URL } from "@/lib/constants";

const TRANSFER_LIMIT = 10;

interface HolderData {
	holderAddress: string;
	balance: string;
	percentage: number;
}

interface TokenDetailClientProps {
	initialToken: TokenHubCache;
	initialHolders: HolderData[];
	initialTransfers: { transfers: TokenTransfer[]; total: number };
}

export function TokenDetailClient({
	initialToken,
	initialHolders,
	initialTransfers,
}: TokenDetailClientProps) {
	const [transferPage, setTransferPage] = useState(1);

	const { data: token } = useQuery({
		queryKey: ["token-detail", initialToken.address],
		queryFn: () => getTokenDetail(initialToken.address),
		staleTime: 30_000,
		initialData: initialToken,
	});

	const { data: holders = [] } = useQuery({
		queryKey: ["token-holders", initialToken.address],
		queryFn: () => getTokenHolderDistribution(initialToken.address),
		staleTime: 60_000,
		initialData: initialHolders,
	});

	const { data: trustSignals } = useQuery({
		queryKey: ["token-trust-signals", initialToken.address],
		queryFn: () => getTokenTrustSignals(initialToken.address),
		staleTime: 60_000,
	});

	const { data: transferData, isLoading: transfersLoading } = useQuery({
		queryKey: ["token-transfers", initialToken.address, transferPage],
		queryFn: () =>
			getTokenTransfers(initialToken.address, {
				offset: 0,
				limit: transferPage * TRANSFER_LIMIT,
			}),
		staleTime: 30_000,
		initialData: transferPage === 1 ? initialTransfers : undefined,
	});

	const handleLoadMoreTransfers = useCallback(() => {
		setTransferPage((prev) => prev + 1);
	}, []);

	if (!token) return null;

	const transfers = transferData?.transfers ?? [];
	const transferTotal = transferData?.total ?? 0;

	return (
		<PageContainer className="py-8 sm:py-12">
			<div className="space-y-8">
				<div className="flex items-start justify-between gap-4">
					<div className="flex-1">
						<TokenOverview token={token} trustSignals={trustSignals} />
					</div>
					<WatchlistButton tokenAddress={token.address} className="mt-1" />
				</div>

				<Tabs defaultValue="holders">
					<TabsList className="border-b border-anvil-gray-light bg-transparent">
						<TabsTrigger
							value="holders"
							className="text-smoke data-[state=active]:text-indigo"
						>
							Holders
						</TabsTrigger>
						<TabsTrigger
							value="activity"
							className="text-smoke data-[state=active]:text-indigo"
						>
							Activity
						</TabsTrigger>
					</TabsList>

					<TabsContent value="holders" className="mt-6">
						<HolderDistribution holders={holders} isForjaCreated={token.isForjaCreated} />
					</TabsContent>

					<TabsContent value="activity" className="mt-6">
						<TokenActivity
							transfers={transfers}
							total={transferTotal}
							isLoading={transfersLoading}
							hasMore={transfers.length < transferTotal}
							onLoadMore={handleLoadMoreTransfers}
						/>
					</TabsContent>
				</Tabs>

				{/* Share */}
				<div className="space-y-2">
					<h3 className="text-sm font-medium text-smoke">Share</h3>
					<ShareButtons
						url={`${APP_URL}/tokens/${token.address}`}
						title={`${token.name} ($${token.symbol}) on Tempo`}
						description="Discover tokens on FORJA — forja.fun"
					/>
				</div>

				{/* Liquidity guidance */}
				{token.isForjaCreated && <LiquidityGuidance />}
			</div>
		</PageContainer>
	);
}
