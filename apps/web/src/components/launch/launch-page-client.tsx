"use client";

import { useQuery } from "@tanstack/react-query";
import { RocketIcon, TrendingUpIcon, XIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { getLaunches, type LaunchListItem, type LaunchStatsData } from "@/actions/launches";
import { LaunchGrid } from "@/components/launch/launch-grid";
import { LaunchSearch } from "@/components/launch/launch-search";
import { PageContainer } from "@/components/layout/page-container";
import { Button } from "@/components/ui/button";
import { FilterChip } from "@/components/ui/filter-chip";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TIP20_DECIMALS } from "@/lib/constants";
import { LAUNCH_TAG_SET, LAUNCH_TAGS } from "@/lib/launch-tags";

type StatusTab = "hot" | "new" | "graduated";

const formatter = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

function formatUsdcCompact(raw: string): string {
	const n = Number(BigInt(raw)) / 10 ** TIP20_DECIMALS;
	return `$${formatter.format(n)}`;
}

function parseTagsFromUrl(raw: string | null): string[] {
	if (!raw) return [];
	return raw
		.split(",")
		.map((t) => t.trim())
		.filter((t) => LAUNCH_TAG_SET.has(t));
}

interface Props {
	initialData: { launches: LaunchListItem[]; total: number };
	initialStats: LaunchStatsData;
}

export function LaunchPageClient({ initialData, initialStats }: Props) {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();

	const [search, setSearch] = useState("");
	const [tab, setTab] = useState<StatusTab>("hot");
	const [limit, setLimit] = useState(20);

	const selectedTags = useMemo(() => parseTagsFromUrl(searchParams.get("tags")), [searchParams]);

	const updateTagsInUrl = useCallback(
		(next: string[]) => {
			const params = new URLSearchParams(searchParams.toString());
			if (next.length === 0) params.delete("tags");
			else params.set("tags", next.join(","));
			const qs = params.toString();
			router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
		},
		[pathname, router, searchParams],
	);

	const toggleTag = useCallback(
		(tag: string) => {
			const next = selectedTags.includes(tag)
				? selectedTags.filter((t) => t !== tag)
				: [...selectedTags, tag];
			updateTagsInUrl(next);
			setLimit(20);
		},
		[selectedTags, updateTagsInUrl],
	);

	const clearTags = useCallback(() => {
		updateTagsInUrl([]);
		setLimit(20);
	}, [updateTagsInUrl]);

	const statusFilter = tab === "graduated" ? "graduated" : "active";
	const sortOption = tab === "hot" ? "volume" : tab === "graduated" ? "graduated" : "newest";

	const { data, isLoading } = useQuery({
		queryKey: ["launches", search, tab, limit, selectedTags.join(",")],
		queryFn: () =>
			getLaunches({
				search: search || undefined,
				status: statusFilter as "active" | "graduated",
				sort: sortOption,
				tags: selectedTags.length > 0 ? selectedTags : undefined,
				limit,
			}),
		initialData:
			tab === "hot" && !search && limit === 20 && selectedTags.length === 0
				? initialData
				: undefined,
		staleTime: 15_000,
	});

	const launches = data?.launches ?? [];
	const total = data?.total ?? 0;
	const hasMore = launches.length < total;

	const handleLoadMore = useCallback(() => {
		setLimit((prev) => prev + 20);
	}, []);

	return (
		<PageContainer className="py-8 sm:py-12">
			<div className="space-y-8">
				<PageHeader
					title="Launch"
					description="Token launchpad with bonding curve and automatic Uniswap v4 graduation"
					action={
						<Link href="/launch/create">
							<Button className="bg-primary text-primary-foreground hover:bg-primary/90">
								<RocketIcon className="mr-2 size-4" />
								Create Launch
							</Button>
						</Link>
					}
				/>

				<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
					<StatCard label="Total Launches" value={initialStats.totalLaunches.toString()} />
					<StatCard label="Active" value={initialStats.activeLaunches.toString()} />
					<StatCard label="Graduated" value={initialStats.graduatedLaunches.toString()} />
					<StatCard
						label="Total Volume"
						value={formatUsdcCompact(initialStats.totalVolume)}
						icon={<TrendingUpIcon className="size-4 text-indigo" />}
					/>
				</div>

				<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<Tabs
						value={tab}
						onValueChange={(v) => {
							setTab(v as StatusTab);
							setLimit(20);
						}}
					>
						<TabsList className="border-b border-anvil-gray-light bg-transparent">
							<TabsTrigger value="hot" className="text-smoke data-[state=active]:text-indigo">
								Hot
							</TabsTrigger>
							<TabsTrigger value="new" className="text-smoke data-[state=active]:text-indigo">
								New
							</TabsTrigger>
							<TabsTrigger value="graduated" className="text-smoke data-[state=active]:text-indigo">
								Graduated
							</TabsTrigger>
						</TabsList>
					</Tabs>

					<div className="w-full sm:w-80">
						<LaunchSearch
							value={search}
							onChange={(v) => {
								setSearch(v);
								setLimit(20);
							}}
						/>
					</div>
				</div>

				{/* Tag filters */}
				<div className="flex flex-col gap-2">
					<div className="flex flex-wrap items-center gap-2">
						<span className="text-xs font-medium uppercase tracking-wider text-smoke-dark">
							Tags:
						</span>
						{LAUNCH_TAGS.map((tag) => (
							<FilterChip
								key={tag}
								active={selectedTags.includes(tag)}
								onClick={() => toggleTag(tag)}
							>
								{tag}
							</FilterChip>
						))}
						{selectedTags.length > 0 && (
							<button
								type="button"
								onClick={clearTags}
								className="inline-flex items-center gap-1 rounded-full border border-anvil-gray-light px-2.5 py-1 text-xs text-smoke-dark hover:border-red-500/40 hover:text-red-400"
							>
								<XIcon className="size-3" />
								Clear
							</button>
						)}
					</div>
				</div>

				<LaunchGrid
					launches={launches}
					total={total}
					isLoading={isLoading}
					hasMore={hasMore}
					onLoadMore={handleLoadMore}
				/>
			</div>
		</PageContainer>
	);
}
