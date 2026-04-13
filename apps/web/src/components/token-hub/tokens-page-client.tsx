"use client";

import type { TokenHubCache } from "@forja/db";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import { getTokenHubStats, getTokenList } from "@/actions/token-hub";
import { PageContainer } from "@/components/layout/page-container";
import { TokenFilters } from "@/components/token-hub/token-filters";
import { TokenGrid } from "@/components/token-hub/token-grid";
import { TokenSearch } from "@/components/token-hub/token-search";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { PageHeader } from "@/components/ui/page-header";

type SortOption = "newest" | "oldest" | "holders" | "transfers";

const LIMIT = 20;
const VALID_SORTS = new Set<string>(["newest", "oldest", "holders", "transfers"]);

function parseSortParam(value: string | null): SortOption {
	return VALID_SORTS.has(value ?? "") ? (value as SortOption) : "newest";
}

interface TokensPageClientProps {
	initialData: { tokens: TokenHubCache[]; total: number };
	initialStats: { totalTokens: number; forjaTokens: number; totalHolders: number };
}

export function TokensPageClient({ initialData, initialStats }: TokensPageClientProps) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [, startTransition] = useTransition();

	// URL is source of truth for sort and forjaOnly
	const sort = parseSortParam(searchParams.get("sort"));
	const forjaOnly = searchParams.get("forja") === "1";
	const urlSearch = searchParams.get("q") ?? "";

	// Search: local state for input responsiveness, synced with URL
	const [search, setSearch] = useState(urlSearch);
	const [page, setPage] = useState(1);

	// Sync search from URL on external navigation (back/forward)
	useEffect(() => {
		setSearch(urlSearch);
		setPage(1);
	}, [urlSearch]);

	const updateUrl = useCallback(
		(newSearch: string, newSort: SortOption, newForjaOnly: boolean) => {
			const params = new URLSearchParams();
			if (newSearch) params.set("q", newSearch);
			if (newSort !== "newest") params.set("sort", newSort);
			if (newForjaOnly) params.set("forja", "1");
			const qs = params.toString();
			startTransition(() => {
				router.replace(qs ? `/tokens?${qs}` : "/tokens", { scroll: false });
			});
		},
		[router],
	);

	const { data: stats } = useQuery({
		queryKey: ["token-hub-stats"],
		queryFn: () => getTokenHubStats(),
		staleTime: 60_000,
		initialData: initialStats,
	});

	const { data, isLoading } = useQuery({
		queryKey: ["token-list", search, sort, forjaOnly, page],
		queryFn: () => getTokenList({ search, sort, forjaOnly, offset: 0, limit: page * LIMIT }),
		staleTime: 30_000,
		initialData: page === 1 ? initialData : undefined,
	});

	const handleSearchChange = useCallback(
		(value: string) => {
			setSearch(value);
			setPage(1);
			updateUrl(value, sort, forjaOnly);
		},
		[sort, forjaOnly, updateUrl],
	);

	const handleSortChange = useCallback(
		(value: SortOption) => {
			setPage(1);
			updateUrl(search, value, forjaOnly);
		},
		[search, forjaOnly, updateUrl],
	);

	const handleForjaOnlyChange = useCallback(
		(value: boolean) => {
			setPage(1);
			updateUrl(search, sort, value);
		},
		[search, sort, updateUrl],
	);

	const handleLoadMore = useCallback(() => {
		setPage((prev) => prev + 1);
	}, []);

	const tokens = data?.tokens ?? [];
	const total = data?.total ?? 0;

	return (
		<PageContainer className="py-8 sm:py-12">
			<div className="space-y-8">
				<PageHeader title="Token Hub" description="Discover and explore tokens on Tempo" />

				{stats && (
					<div className="grid grid-cols-3 gap-4">
						<div className="rounded-lg border border-border-subtle bg-surface-card p-4 text-center">
							<AnimatedCounter
								value={stats.totalTokens}
								className="font-mono text-2xl font-bold text-indigo"
							/>
							<p className="mt-1 text-xs text-smoke-dark">Total Tokens</p>
						</div>
						<div className="rounded-lg border border-border-subtle bg-surface-card p-4 text-center">
							<AnimatedCounter
								value={stats.forjaTokens}
								className="font-mono text-2xl font-bold text-indigo"
							/>
							<p className="mt-1 text-xs text-smoke-dark">FORJA Created</p>
						</div>
						<div className="rounded-lg border border-border-subtle bg-surface-card p-4 text-center">
							<AnimatedCounter
								value={stats.totalHolders}
								className="font-mono text-2xl font-bold text-indigo"
							/>
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
