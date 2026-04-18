"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import {
	getTokenHubStats,
	getTokenList,
	type SortOption,
	type SourceFilter,
	type StatusFilter,
	type TokenEnriched,
} from "@/actions/token-hub";
import { PageContainer } from "@/components/layout/page-container";
import { ToolHero } from "@/components/shared/tool-hero";
import { useReveal } from "@/components/shared/use-reveal";
import { TokenFilters } from "@/components/token-hub/token-filters";
import { TokenGrid } from "@/components/token-hub/token-grid";
import { TokenSearch } from "@/components/token-hub/token-search";
import { TrendingRow } from "@/components/token-hub/trending-row";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { LAUNCH_TAG_SET } from "@/lib/launch-tags";

const LIMIT = 20;

const VALID_SORTS = new Set<SortOption>([
	"trending",
	"newest",
	"oldest",
	"holders",
	"transfers",
	"recent_activity",
]);
const VALID_SOURCES = new Set<SourceFilter>(["all", "forja", "launchpad"]);
const VALID_STATUSES = new Set<StatusFilter>(["all", "new", "active", "dormant", "concentrated"]);

function parseSort(value: string | null): SortOption {
	return VALID_SORTS.has(value as SortOption) ? (value as SortOption) : "newest";
}
function parseSource(value: string | null, legacyForja: boolean): SourceFilter {
	if (VALID_SOURCES.has(value as SourceFilter)) return value as SourceFilter;
	return legacyForja ? "forja" : "all";
}
function parseStatus(value: string | null): StatusFilter {
	return VALID_STATUSES.has(value as StatusFilter) ? (value as StatusFilter) : "all";
}
function parseTags(raw: string | null): string[] {
	if (!raw) return [];
	return raw
		.split(",")
		.map((t) => t.trim())
		.filter((t) => LAUNCH_TAG_SET.has(t));
}

interface TokensPageClientProps {
	initialData: { tokens: TokenEnriched[]; total: number };
	initialStats: { totalTokens: number; forjaTokens: number; totalHolders: number };
	initialTrending: TokenEnriched[];
}

export function TokensPageClient({
	initialData,
	initialStats,
	initialTrending,
}: TokensPageClientProps) {
	useReveal();
	const router = useRouter();
	const searchParams = useSearchParams();
	const [, startTransition] = useTransition();

	const sort = parseSort(searchParams.get("sort"));
	const legacyForja = searchParams.get("forja") === "1";
	const source = parseSource(searchParams.get("source"), legacyForja);
	const status = parseStatus(searchParams.get("status"));
	const tags = useMemo(() => parseTags(searchParams.get("tags")), [searchParams]);
	const urlSearch = searchParams.get("q") ?? "";

	const [search, setSearch] = useState(urlSearch);
	const [page, setPage] = useState(1);

	useEffect(() => {
		setSearch(urlSearch);
		setPage(1);
	}, [urlSearch]);

	const updateUrl = useCallback(
		(overrides: {
			search?: string;
			sort?: SortOption;
			source?: SourceFilter;
			status?: StatusFilter;
			tags?: string[];
		}) => {
			const params = new URLSearchParams();
			const nextSearch = overrides.search ?? search;
			const nextSort = overrides.sort ?? sort;
			const nextSource = overrides.source ?? source;
			const nextStatus = overrides.status ?? status;
			const nextTags = overrides.tags ?? tags;

			if (nextSearch) params.set("q", nextSearch);
			if (nextSort !== "newest") params.set("sort", nextSort);
			if (nextSource !== "all") params.set("source", nextSource);
			if (nextStatus !== "all") params.set("status", nextStatus);
			if (nextTags.length > 0) params.set("tags", nextTags.join(","));

			const qs = params.toString();
			startTransition(() => {
				router.replace(qs ? `/tokens?${qs}` : "/tokens", { scroll: false });
			});
		},
		[router, search, sort, source, status, tags],
	);

	const { data: stats } = useQuery({
		queryKey: ["token-hub-stats"],
		queryFn: () => getTokenHubStats(),
		staleTime: 60_000,
		initialData: initialStats,
	});

	const { data, isLoading } = useQuery({
		queryKey: ["token-list", search, sort, source, status, tags.join(","), page],
		queryFn: () =>
			getTokenList({
				search,
				sort,
				source,
				status,
				tags: tags.length > 0 ? tags : undefined,
				offset: 0,
				limit: page * LIMIT,
			}),
		staleTime: 30_000,
		initialData:
			page === 1 &&
			!search &&
			sort === "newest" &&
			source === "all" &&
			status === "all" &&
			tags.length === 0
				? initialData
				: undefined,
	});

	const handleSearchChange = useCallback(
		(value: string) => {
			setSearch(value);
			setPage(1);
			updateUrl({ search: value });
		},
		[updateUrl],
	);

	const handleSourceChange = useCallback(
		(value: SourceFilter) => {
			setPage(1);
			updateUrl({ source: value });
		},
		[updateUrl],
	);
	const handleStatusChange = useCallback(
		(value: StatusFilter) => {
			setPage(1);
			updateUrl({ status: value });
		},
		[updateUrl],
	);
	const handleSortChange = useCallback(
		(value: SortOption) => {
			setPage(1);
			updateUrl({ sort: value });
		},
		[updateUrl],
	);
	const handleToggleTag = useCallback(
		(tag: string) => {
			setPage(1);
			const next = tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag];
			updateUrl({ tags: next });
		},
		[tags, updateUrl],
	);
	const handleClearAll = useCallback(() => {
		setSearch("");
		setPage(1);
		startTransition(() => {
			router.replace("/tokens", { scroll: false });
		});
	}, [router]);

	const handleLoadMore = useCallback(() => {
		setPage((prev) => prev + 1);
	}, []);

	const tokens = data?.tokens ?? [];
	const total = data?.total ?? 0;

	const statCards: Array<{ label: string; value: number; color: string }> = stats
		? [
				{ label: "Total tokens", value: stats.totalTokens, color: "var(--color-gold)" },
				{ label: "Forged on FORJA", value: stats.forjaTokens, color: "var(--color-indigo)" },
				{ label: "Total holders", value: stats.totalHolders, color: "var(--color-green)" },
			]
		: [];

	return (
		<PageContainer className="py-16 sm:py-20 lg:py-24">
			<div className="space-y-10">
				<ToolHero
					number="/07"
					label="Tokens · Discovery"
					accent="gold"
					title={
						<>
							Every TIP-20 on Tempo.
							<br />
							<span className="gold-text italic">One index.</span>
						</>
					}
					description="Search, filter, and explore every token on Tempo — FORJA-forged, launchpad, or external. Holder growth, trust signals, and live price at a glance."
				/>

				{initialTrending.length > 0 && (
					<div className="reveal">
						<TrendingRow tokens={initialTrending} />
					</div>
				)}

				{stats && (
					<div
						className="reveal grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-border-hair sm:grid-cols-3"
						style={{ background: "var(--color-border-hair)" }}
					>
						{statCards.map((s) => (
							<div key={s.label} className="bg-bg-elevated px-6 py-5 text-center sm:text-left">
								<p className="font-mono text-[11px] uppercase tracking-[0.14em] text-text-tertiary">
									{s.label}
								</p>
								<div
									className="mt-2 font-display text-[32px] font-normal tracking-[-0.025em]"
									style={{ color: s.color }}
								>
									<AnimatedCounter value={s.value} />
								</div>
							</div>
						))}
					</div>
				)}

				<div className="reveal flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div className="flex-1 sm:max-w-md">
						<TokenSearch value={search} onChange={handleSearchChange} />
					</div>
				</div>

				<div className="reveal">
					<TokenFilters
						source={source}
						status={status}
						tags={tags}
						sort={sort}
						onSourceChange={handleSourceChange}
						onStatusChange={handleStatusChange}
						onToggleTag={handleToggleTag}
						onSortChange={handleSortChange}
						onClearAll={handleClearAll}
					/>
				</div>

				<div className="reveal">
					<TokenGrid
						tokens={tokens}
						total={total}
						isLoading={isLoading}
						hasMore={tokens.length < total}
						onLoadMore={handleLoadMore}
					/>
				</div>
			</div>
		</PageContainer>
	);
}
