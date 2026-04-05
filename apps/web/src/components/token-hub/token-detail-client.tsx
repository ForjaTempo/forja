"use client";

import type { TokenHubCache, TokenTransfer } from "@forja/db";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { getTokenDetail, getTokenHolderDistribution, getTokenTransfers } from "@/actions/token-hub";
import { PageContainer } from "@/components/layout/page-container";
import { HolderDistribution } from "@/components/token-hub/holder-distribution";
import { TokenActivity } from "@/components/token-hub/token-activity";
import { TokenOverview } from "@/components/token-hub/token-overview";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
				<TokenOverview token={token} />

				<Tabs defaultValue="holders">
					<TabsList className="border-b border-anvil-gray-light bg-transparent">
						<TabsTrigger
							value="holders"
							className="text-smoke data-[state=active]:text-molten-amber"
						>
							Holders
						</TabsTrigger>
						<TabsTrigger
							value="activity"
							className="text-smoke data-[state=active]:text-molten-amber"
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
			</div>
		</PageContainer>
	);
}
