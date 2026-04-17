"use client";

import { XIcon } from "lucide-react";
import type { SortOption, SourceFilter, StatusFilter } from "@/actions/token-hub";
import { FilterChip } from "@/components/ui/filter-chip";
import { LAUNCH_TAGS } from "@/lib/launch-tags";

const SOURCE_OPTIONS: { value: SourceFilter; label: string }[] = [
	{ value: "all", label: "All" },
	{ value: "forja", label: "FORJA" },
	{ value: "launchpad", label: "Launchpad" },
];

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
	{ value: "all", label: "All" },
	{ value: "new", label: "New" },
	{ value: "active", label: "Active" },
	{ value: "dormant", label: "Dormant" },
	{ value: "concentrated", label: "Concentrated" },
];

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
	{ value: "trending", label: "Trending" },
	{ value: "newest", label: "Newest" },
	{ value: "holders", label: "Holders" },
	{ value: "transfers", label: "Most Active" },
	{ value: "oldest", label: "Oldest" },
];

interface TokenFiltersProps {
	source: SourceFilter;
	status: StatusFilter;
	tags: string[];
	sort: SortOption;
	onSourceChange: (v: SourceFilter) => void;
	onStatusChange: (v: StatusFilter) => void;
	onToggleTag: (tag: string) => void;
	onSortChange: (v: SortOption) => void;
	onClearAll: () => void;
}

export function TokenFilters({
	source,
	status,
	tags,
	sort,
	onSourceChange,
	onStatusChange,
	onToggleTag,
	onSortChange,
	onClearAll,
}: TokenFiltersProps) {
	const hasActive = source !== "all" || status !== "all" || tags.length > 0 || sort !== "newest";

	return (
		<div className="space-y-3">
			<FilterRow label="Source">
				{SOURCE_OPTIONS.map((opt) => (
					<FilterChip
						key={opt.value}
						active={source === opt.value}
						onClick={() => onSourceChange(opt.value)}
					>
						{opt.label}
					</FilterChip>
				))}
			</FilterRow>

			<FilterRow label="Status">
				{STATUS_OPTIONS.map((opt) => (
					<FilterChip
						key={opt.value}
						active={status === opt.value}
						onClick={() => onStatusChange(opt.value)}
					>
						{opt.label}
					</FilterChip>
				))}
			</FilterRow>

			<FilterRow label="Tags">
				{LAUNCH_TAGS.map((tag) => (
					<FilterChip key={tag} active={tags.includes(tag)} onClick={() => onToggleTag(tag)}>
						{tag}
					</FilterChip>
				))}
			</FilterRow>

			<FilterRow label="Sort">
				{SORT_OPTIONS.map((opt) => (
					<FilterChip
						key={opt.value}
						active={sort === opt.value}
						onClick={() => onSortChange(opt.value)}
					>
						{opt.label}
					</FilterChip>
				))}
				{hasActive && (
					<button
						type="button"
						onClick={onClearAll}
						className="inline-flex items-center gap-1 rounded-full border border-anvil-gray-light px-2.5 py-1 text-xs text-smoke-dark hover:border-red-500/40 hover:text-red-400"
					>
						<XIcon className="size-3" />
						Clear all
					</button>
				)}
			</FilterRow>
		</div>
	);
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<div className="flex flex-wrap items-center gap-2">
			<span className="w-14 shrink-0 text-xs font-medium uppercase tracking-wider text-smoke-dark">
				{label}
			</span>
			{children}
		</div>
	);
}
