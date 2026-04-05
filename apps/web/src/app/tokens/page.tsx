"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { getTokenHubStats, getTokenList } from "@/actions/token-hub";
import { PageContainer } from "@/components/layout/page-container";
import { TokenFilters } from "@/components/token-hub/token-filters";
import { TokenGrid } from "@/components/token-hub/token-grid";
import { TokenSearch } from "@/components/token-hub/token-search";
import { PageHeader } from "@/components/ui/page-header";

type SortOption = "newest" | "oldest" | "holders" | "transfers";

const LIMIT = 20;
const formatter = new Intl.NumberFormat("en-US");

export default function TokensPage() {
	const [search, setSearch] = useState("");
	const [sort, setSort] = useState<SortOption>("newest");
	const [forjaOnly, setForjaOnly] = useState(false);
	const [offset, setOffset] = useState(0);

	const { data: stats } = useQuery({
		queryKey: ["token-hub-stats"],
		queryFn: () => getTokenHubStats(),
		staleTime: 60_000,
	});

	const { data, isLoading } = useQuery({
		queryKey: ["token-list", search, sort, forjaOnly, offset],
		queryFn: () => getTokenList({ search, sort, forjaOnly, offset, limit: offset + LIMIT }),
		staleTime: 30_000,
	});

	const handleSearchChange = useCallback((value: string) => {
		setSearch(value);
		setOffset(0);
	}, []);

	const handleSortChange = useCallback((value: SortOption) => {
		setSort(value);
		setOffset(0);
	}, []);

	const handleForjaOnlyChange = useCallback((value: boolean) => {
		setForjaOnly(value);
		setOffset(0);
	}, []);

	const handleLoadMore = useCallback(() => {
		setOffset((prev) => prev + LIMIT);
	}, []);

	const tokens = data?.tokens ?? [];
	const total = data?.total ?? 0;

	return (
		<PageContainer className="py-8 sm:py-12">
			<div className="space-y-8">
				<PageHeader title="Token Hub" description="Discover and explore tokens on Tempo" />

				{stats && (
					<div className="grid grid-cols-3 gap-4">
						<div className="rounded-lg border border-anvil-gray-light bg-deep-charcoal p-4 text-center">
							<p className="font-mono text-2xl font-bold text-molten-amber">
								{formatter.format(stats.totalTokens)}
							</p>
							<p className="mt-1 text-xs text-smoke-dark">Total Tokens</p>
						</div>
						<div className="rounded-lg border border-anvil-gray-light bg-deep-charcoal p-4 text-center">
							<p className="font-mono text-2xl font-bold text-molten-amber">
								{formatter.format(stats.forjaTokens)}
							</p>
							<p className="mt-1 text-xs text-smoke-dark">FORJA Created</p>
						</div>
						<div className="rounded-lg border border-anvil-gray-light bg-deep-charcoal p-4 text-center">
							<p className="font-mono text-2xl font-bold text-molten-amber">
								{formatter.format(stats.totalHolders)}
							</p>
							<p className="mt-1 text-xs text-smoke-dark">Total Holders</p>
						</div>
					</div>
				)}

				<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div className="flex-1 sm:max-w-md">
						<TokenSearch value={search} onChange={handleSearchChange} />
					</div>
					<TokenFilters
						sort={sort}
						onSortChange={handleSortChange}
						forjaOnly={forjaOnly}
						onForjaOnlyChange={handleForjaOnlyChange}
					/>
				</div>

				<TokenGrid
					tokens={tokens}
					total={total}
					isLoading={isLoading}
					hasMore={tokens.length < total}
					onLoadMore={handleLoadMore}
				/>
			</div>
		</PageContainer>
	);
}
