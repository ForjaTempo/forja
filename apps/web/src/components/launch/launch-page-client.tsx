"use client";

import { useQuery } from "@tanstack/react-query";
import { XIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { getLaunches, type LaunchListItem, type LaunchStatsData } from "@/actions/launches";
import { LaunchGrid } from "@/components/launch/launch-grid";
import { LaunchSearch } from "@/components/launch/launch-search";
import { PageContainer } from "@/components/layout/page-container";
import { CursorGlow } from "@/components/shared/cursor-glow";
import { useReveal } from "@/components/shared/use-reveal";
import { TIP20_DECIMALS } from "@/lib/constants";
import { LAUNCH_TAG_SET, LAUNCH_TAGS } from "@/lib/launch-tags";

type StatusTab = "all" | "trending" | "new" | "graduating";

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

const FILTER_TABS: { value: StatusTab; label: string }[] = [
	{ value: "all", label: "all" },
	{ value: "trending", label: "trending" },
	{ value: "new", label: "new" },
	{ value: "graduating", label: "graduating" },
];

export function LaunchPageClient({ initialData, initialStats }: Props) {
	useReveal();

	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();

	const [search, setSearch] = useState("");
	const [tab, setTab] = useState<StatusTab>("all");
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

	// Map the new editorial tabs onto the existing server filter vocabulary so
	// we don't break data-fetching. "graduating" shows actives sorted by volume
	// (closest-to-graduation signal we already return).
	const { statusFilter, sortOption } = useMemo(() => {
		switch (tab) {
			case "trending":
				return { statusFilter: "active" as const, sortOption: "volume" as const };
			case "new":
				return { statusFilter: "active" as const, sortOption: "newest" as const };
			case "graduating":
				return { statusFilter: "graduated" as const, sortOption: "graduated" as const };
			default:
				return { statusFilter: undefined, sortOption: "newest" as const };
		}
	}, [tab]);

	const { data, isLoading } = useQuery({
		queryKey: ["launches", search, tab, limit, selectedTags.join(",")],
		queryFn: () =>
			getLaunches({
				search: search || undefined,
				status: statusFilter,
				sort: sortOption,
				tags: selectedTags.length > 0 ? selectedTags : undefined,
				limit,
			}),
		initialData:
			tab === "all" && !search && limit === 20 && selectedTags.length === 0
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

	const stats = [
		{ label: "24h volume", value: "—", color: "var(--color-gold)" },
		{
			label: "Active markets",
			value: initialStats.activeLaunches.toString(),
			color: "#f472b6",
		},
		{
			label: "Graduated all-time",
			value: initialStats.graduatedLaunches.toString(),
			color: "var(--color-green)",
		},
		{
			label: "Total volume",
			value: formatUsdcCompact(initialStats.totalVolume),
			color: "var(--color-indigo)",
		},
	];

	return (
		<>
			<CursorGlow color="rgba(244,114,182,0.06)" />
			<PageContainer className="py-16 sm:py-20 lg:py-24">
				<div className="space-y-10">
					{/* Hero */}
					<div className="reveal flex flex-wrap items-end justify-between gap-10">
						<div className="max-w-[720px]">
							<div
								className="mb-5 inline-flex items-center gap-2.5 rounded-full border py-1.5 pl-1.5 pr-3 text-xs"
								style={{
									background: "rgba(244,114,182,0.08)",
									borderColor: "rgba(244,114,182,0.2)",
									color: "#f472b6",
								}}
							>
								<span
									className="rounded-sm px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-[0.08em]"
									style={{ background: "#f472b6", color: "#1a0a00" }}
								>
									/05
								</span>
								Launchpad · Bonding curve markets
							</div>
							<h1
								className="m-0 font-display font-normal leading-[0.95] tracking-[-0.04em]"
								style={{ fontSize: "clamp(48px, 8vw, 104px)" }}
							>
								Price discovery,
								<br />
								<span
									style={{
										fontStyle: "italic",
										background: "linear-gradient(135deg, #f472b6, #a78bfa)",
										WebkitBackgroundClip: "text",
										backgroundClip: "text",
										WebkitTextFillColor: "transparent",
									}}
								>
									by math.
								</span>
							</h1>
							<p className="mt-6 max-w-[620px] text-lg leading-[1.55] text-text-secondary">
								Every token starts at zero and graduates to Uniswap v4 liquidity. No pre-sales, no
								allocations, no insider rugs — just math and conviction.
							</p>
						</div>

						<div className="flex flex-col items-end gap-3">
							<Link
								href="/launch/create"
								className="inline-flex items-center rounded-xl px-[22px] py-3.5 text-sm font-semibold transition-transform hover:-translate-y-0.5"
								style={{
									background: "linear-gradient(135deg, #f472b6, #a78bfa)",
									color: "#1a0620",
									boxShadow: "0 4px 24px rgba(244,114,182,0.3)",
								}}
							>
								+ Launch a token
							</Link>
							<div className="font-mono text-xs text-text-tertiary">
								{initialStats.activeLaunches} active · {initialStats.graduatedLaunches} graduated
							</div>
						</div>
					</div>

					{/* Stats band — 4-up with hairline dividers */}
					<div
						className="reveal grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border-hair md:grid-cols-4"
						style={{ background: "var(--color-border-hair)" }}
					>
						{stats.map((s) => (
							<div key={s.label} className="bg-bg-elevated px-7 py-6">
								<div className="mb-2 font-mono text-[11px] uppercase tracking-[0.14em] text-text-tertiary">
									{s.label}
								</div>
								<div
									className="font-display text-[32px] font-normal tracking-[-0.025em]"
									style={{ color: s.color }}
								>
									{s.value}
								</div>
							</div>
						))}
					</div>

					{/* Filter chips + search */}
					<div className="reveal flex flex-wrap items-center justify-between gap-5">
						<div className="flex gap-1.5 rounded-[10px] border border-border-hair bg-bg-elevated p-1">
							{FILTER_TABS.map((f) => {
								const active = tab === f.value;
								return (
									<button
										key={f.value}
										type="button"
										onClick={() => {
											setTab(f.value);
											setLimit(20);
										}}
										className="rounded-[7px] px-3.5 py-2 text-[13px] font-medium capitalize transition-colors"
										style={{
											background: active ? "var(--color-bg-card)" : "transparent",
											color: active ? "var(--color-text-primary)" : "var(--color-text-secondary)",
										}}
									>
										{f.label}
									</button>
								);
							})}
						</div>

						<div className="w-full sm:w-[320px]">
							<LaunchSearch
								value={search}
								onChange={(v) => {
									setSearch(v);
									setLimit(20);
								}}
							/>
						</div>
					</div>

					{/* Tag filters (carried over from previous UX) */}
					<div className="reveal flex flex-wrap items-center gap-2">
						<span className="font-mono text-[11px] uppercase tracking-[0.12em] text-text-tertiary">
							Tags
						</span>
						{LAUNCH_TAGS.map((tag) => {
							const active = selectedTags.includes(tag);
							return (
								<button
									key={tag}
									type="button"
									onClick={() => toggleTag(tag)}
									className="inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium transition-colors"
									style={{
										background: active ? "rgba(244,114,182,0.1)" : "var(--color-bg-elevated)",
										borderColor: active ? "rgba(244,114,182,0.4)" : "var(--color-border-hair)",
										color: active ? "#f472b6" : "var(--color-text-secondary)",
									}}
								>
									{tag}
								</button>
							);
						})}
						{selectedTags.length > 0 && (
							<button
								type="button"
								onClick={clearTags}
								className="inline-flex items-center gap-1 rounded-full border border-border-hair px-2.5 py-1 text-xs text-text-tertiary hover:border-red/40 hover:text-red"
							>
								<XIcon className="size-3" />
								Clear
							</button>
						)}
					</div>

					{/* Grid */}
					<div className="reveal">
						<LaunchGrid
							launches={launches}
							total={total}
							isLoading={isLoading}
							hasMore={hasMore}
							onLoadMore={handleLoadMore}
						/>
					</div>

					{/* Curve explainer */}
					<div
						className="reveal mt-20 grid grid-cols-1 items-center gap-10 rounded-3xl border border-border-hair p-12 lg:grid-cols-2 lg:gap-14"
						style={{
							background: "linear-gradient(135deg, rgba(244,114,182,0.06), rgba(167,139,250,0.04))",
						}}
					>
						<div>
							<div
								className="mb-4 font-mono text-[11px] uppercase tracking-[0.2em]"
								style={{ color: "#f472b6" }}
							>
								How bonding works
							</div>
							<h3 className="mb-5 font-display text-[44px] font-normal leading-[1.05] tracking-[-0.03em]">
								Every buy raises the price.
								<br />
								<span className="italic text-text-secondary">Every sell lowers it.</span>
							</h3>
							<p className="text-[15px] leading-[1.65] text-text-secondary">
								Tokens follow a deterministic curve. At $69k market cap the pool graduates —
								liquidity permanently migrates to Uniswap v4. No team, no unlocks, no surprises.
							</p>
							<div className="mt-7 flex gap-6">
								{[
									["Start", "$0"],
									["Graduate", "$69k"],
									["Fee", "0.25%"],
								].map(([l, v]) => (
									<div key={l}>
										<div className="font-mono text-[11px] uppercase tracking-[0.12em] text-text-tertiary">
											{l}
										</div>
										<div className="font-display text-2xl" style={{ color: "#f472b6" }}>
											{v}
										</div>
									</div>
								))}
							</div>
						</div>
						<svg
							viewBox="0 0 400 280"
							className="block w-full"
							role="img"
							aria-label="bonding curve"
						>
							<title>bonding curve</title>
							<defs>
								<linearGradient id="curveFill" x1="0" x2="0" y1="0" y2="1">
									<stop offset="0" stopColor="#f472b6" stopOpacity="0.4" />
									<stop offset="1" stopColor="#f472b6" stopOpacity="0" />
								</linearGradient>
							</defs>
							{Array.from({ length: 6 }).map((_, i) => (
								<line
									// biome-ignore lint/suspicious/noArrayIndexKey: static 6-line decoration
									key={`grid-${i}`}
									x1="40"
									x2="380"
									y1={40 + i * 40}
									y2={40 + i * 40}
									stroke="var(--color-border-hair)"
									strokeDasharray="2 4"
								/>
							))}
							<path
								d="M 40 240 Q 180 240 240 180 T 380 40"
								fill="none"
								stroke="#f472b6"
								strokeWidth="2.5"
							/>
							<path d="M 40 240 Q 180 240 240 180 T 380 40 L 380 240 Z" fill="url(#curveFill)" />
							{/* Graduation target — sits at the top of the curve. Not a live data point;
							    this is an explainer diagram, so we anchor only at the $0 start and $69k
							    graduation cap instead of showing an arbitrary NOW marker that would lie
							    about a specific launch's current position. */}
							<circle cx="380" cy="40" r="5" fill="var(--color-green)" />
							<circle cx="380" cy="40" r="12" fill="var(--color-green)" opacity="0.25">
								<animate attributeName="r" values="12;20;12" dur="2.4s" repeatCount="indefinite" />
								<animate
									attributeName="opacity"
									values="0.25;0;0.25"
									dur="2.4s"
									repeatCount="indefinite"
								/>
							</circle>
							<text
								x="40"
								y="260"
								fontSize="10"
								fill="var(--color-text-tertiary)"
								fontFamily="var(--font-mono)"
							>
								$0 · START
							</text>
							<text
								x="360"
								y="30"
								fontSize="10"
								fill="var(--color-green)"
								fontFamily="var(--font-mono)"
								textAnchor="end"
							>
								$69k · GRADUATE
							</text>
						</svg>
					</div>
				</div>
			</PageContainer>
		</>
	);
}
