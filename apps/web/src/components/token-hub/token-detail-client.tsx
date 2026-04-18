"use client";

import type { TokenHubCache, TokenTransfer } from "@forja/db";
import { useQuery } from "@tanstack/react-query";
import { ChevronRightIcon } from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";
import { getTokenDetail, getTokenHolderDistribution, getTokenTransfers } from "@/actions/token-hub";
import { getTokenTrustSignals } from "@/actions/trust-signals";
import { PageContainer } from "@/components/layout/page-container";
import { ShareButtons } from "@/components/shared/share-buttons";
import { SwapCta } from "@/components/swap/swap-cta";
import { LiquidityGuidance } from "@/components/token-detail/liquidity-guidance";
import { ConcentrationWarning } from "@/components/token-hub/concentration-warning";
import { HolderDistribution } from "@/components/token-hub/holder-distribution";
import { LaunchpadLink } from "@/components/token-hub/launchpad-link";
import { TokenActivity } from "@/components/token-hub/token-activity";
import { TokenOverview } from "@/components/token-hub/token-overview";
import { TransferVolumeChart } from "@/components/token-hub/transfer-volume-chart";
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
				<nav className="flex items-center gap-1.5 font-mono text-[11px] text-text-tertiary uppercase tracking-[0.1em]">
					<Link href="/" className="transition-colors hover:text-text-secondary">
						Home
					</Link>
					<ChevronRightIcon className="size-3" />
					<Link href="/tokens" className="transition-colors hover:text-text-secondary">
						Tokens
					</Link>
					<ChevronRightIcon className="size-3" />
					<span className="text-gold">{token.symbol}</span>
				</nav>

				<div className="flex flex-col items-stretch justify-between gap-4 md:flex-row md:items-start">
					<div className="flex-1">
						<TokenOverview token={token} trustSignals={trustSignals} />
					</div>
					<div className="flex items-center gap-2 md:mt-1">
						<SwapCta tokenAddress={token.address} />
						<WatchlistButton tokenAddress={token.address} />
					</div>
				</div>

				<ConcentrationWarning topHolderPct={token.topHolderPct} />
				{token.isLaunchpadToken && <LaunchpadLink tokenAddress={token.address} />}

				<TransferVolumeChart tokenAddress={token.address} />

				<Tabs defaultValue="holders">
					<TabsList className="border-border-hair border-b bg-transparent">
						<TabsTrigger
							value="holders"
							className="text-text-secondary data-[state=active]:text-gold"
						>
							Holders
						</TabsTrigger>
						<TabsTrigger
							value="activity"
							className="text-text-secondary data-[state=active]:text-gold"
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

				<div className="space-y-2">
					<h3 className="font-mono text-[10px] text-text-tertiary uppercase tracking-[0.14em]">
						Share
					</h3>
					<ShareButtons
						url={`${APP_URL}/tokens/${token.address}`}
						title={`${token.name} ($${token.symbol}) on Tempo`}
						description="Discover tokens on FORJA — forja.fun"
					/>
				</div>

				{token.isForjaCreated && <LiquidityGuidance />}
			</div>
		</PageContainer>
	);
}
