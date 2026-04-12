"use client";

import { useQuery } from "@tanstack/react-query";
import { RocketIcon, TrendingUpIcon } from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";
import { getLaunches, type LaunchListItem, type LaunchStatsData } from "@/actions/launches";
import { LaunchGrid } from "@/components/launch/launch-grid";
import { LaunchSearch } from "@/components/launch/launch-search";
import { PageContainer } from "@/components/layout/page-container";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TIP20_DECIMALS } from "@/lib/constants";

type StatusTab = "hot" | "new" | "graduated";

const formatter = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

function formatUsdcCompact(raw: string): string {
	const n = Number(BigInt(raw)) / 10 ** TIP20_DECIMALS;
	return `$${formatter.format(n)}`;
}

interface Props {
	initialData: { launches: LaunchListItem[]; total: number };
	initialStats: LaunchStatsData;
}

export function LaunchPageClient({ initialData, initialStats }: Props) {
	const [search, setSearch] = useState("");
	const [tab, setTab] = useState<StatusTab>("hot");
	const [limit, setLimit] = useState(20);

	const statusFilter = tab === "graduated" ? "graduated" : "active";
	const sortOption = tab === "hot" ? "volume" : tab === "graduated" ? "graduated" : "newest";

	const { data, isLoading } = useQuery({
		queryKey: ["launches", search, tab, limit],
		queryFn: () =>
			getLaunches({
				search: search || undefined,
				status: statusFilter as "active" | "graduated",
				sort: sortOption,
				limit,
			}),
		initialData: tab === "hot" && !search && limit === 20 ? initialData : undefined,
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
							<Button className="bg-molten-amber text-forge-black hover:bg-molten-amber/90">
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
						icon={<TrendingUpIcon className="size-4 text-molten-amber" />}
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
							<TabsTrigger value="hot" className="text-smoke data-[state=active]:text-molten-amber">
								Hot
							</TabsTrigger>
							<TabsTrigger value="new" className="text-smoke data-[state=active]:text-molten-amber">
								New
							</TabsTrigger>
							<TabsTrigger
								value="graduated"
								className="text-smoke data-[state=active]:text-molten-amber"
							>
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

function StatCard({
	label,
	value,
	icon,
}: {
	label: string;
	value: string;
	icon?: React.ReactNode;
}) {
	return (
		<div className="rounded-lg border border-anvil-gray-light bg-obsidian-black/50 p-4">
			<p className="text-xs text-smoke-dark">{label}</p>
			<div className="mt-1 flex items-center gap-2">
				{icon}
				<p className="text-lg font-semibold text-steel-white">{value}</p>
			</div>
		</div>
	);
}
