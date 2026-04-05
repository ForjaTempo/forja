"use client";

import { useQuery } from "@tanstack/react-query";
import { notFound, useParams } from "next/navigation";
import { useCallback, useState } from "react";
import { getTokenDetail, getTokenHolderDistribution, getTokenTransfers } from "@/actions/token-hub";
import { PageContainer } from "@/components/layout/page-container";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HolderDistribution } from "@/components/token-hub/holder-distribution";
import { TokenActivity } from "@/components/token-hub/token-activity";
import { TokenOverview } from "@/components/token-hub/token-overview";

const TRANSFER_LIMIT = 10;

export default function TokenDetailPage() {
	const { address } = useParams<{ address: string }>();
	const [transferOffset, setTransferOffset] = useState(0);

	const { data: token, isLoading: tokenLoading } = useQuery({
		queryKey: ["token-detail", address],
		queryFn: () => getTokenDetail(address),
		staleTime: 30_000,
	});

	const { data: holders = [] } = useQuery({
		queryKey: ["token-holders", address],
		queryFn: () => getTokenHolderDistribution(address),
		staleTime: 60_000,
		enabled: !!token,
	});

	const { data: transferData, isLoading: transfersLoading } = useQuery({
		queryKey: ["token-transfers", address, transferOffset],
		queryFn: () => getTokenTransfers(address, { offset: 0, limit: transferOffset + TRANSFER_LIMIT }),
		staleTime: 30_000,
		enabled: !!token,
	});

	const handleLoadMoreTransfers = useCallback(() => {
		setTransferOffset((prev) => prev + TRANSFER_LIMIT);
	}, []);

	if (tokenLoading) {
		return (
			<PageContainer className="py-8 sm:py-12">
				<div className="space-y-6">
					<div className="flex items-start gap-4">
						<Skeleton className="size-14 rounded-full" />
						<div className="flex-1 space-y-2">
							<Skeleton className="h-8 w-48" />
							<Skeleton className="h-5 w-32" />
						</div>
					</div>
					<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
						{Array.from({ length: 4 }).map((_, i) => (
							<Skeleton key={`stat-${i.toString()}`} className="h-20 rounded-lg" />
						))}
					</div>
				</div>
			</PageContainer>
		);
	}

	if (!token) {
		notFound();
	}

	const transfers = transferData?.transfers ?? [];
	const transferTotal = transferData?.total ?? 0;

	return (
		<PageContainer className="py-8 sm:py-12">
			<div className="space-y-8">
				<TokenOverview token={token} />

				<Tabs defaultValue="holders">
					<TabsList className="border-b border-anvil-gray-light bg-transparent">
						<TabsTrigger value="holders" className="text-smoke data-[state=active]:text-molten-amber">
							Holders
						</TabsTrigger>
						<TabsTrigger value="activity" className="text-smoke data-[state=active]:text-molten-amber">
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
							decimals={token.decimals}
						/>
					</TabsContent>
				</Tabs>
			</div>
		</PageContainer>
	);
}
