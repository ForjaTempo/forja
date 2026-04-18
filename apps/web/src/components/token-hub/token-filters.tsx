"use client";

import { XIcon } from "lucide-react";
import type { SortOption, SourceFilter, StatusFilter } from "@/actions/token-hub";
import { FilterChip } from "@/components/ui/filter-chip";
import { LAUNCH_TAGS } from "@/lib/launch-tags";

const SOURCE_OPTIONS: { value: SourceFilter; label: string }[] = [
	{ value: "all", label: "All" },
	{ value: "forja", label: "FORJA" },
	{ value: "launchpad", label: "Launchpad" },
	{ value: "external", label: "External" },
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
	{ value: "transfers", label: "Most active" },
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
						className="inline-flex items-center gap-1 rounded-full border border-border-hair bg-bg-field px-2.5 py-1 font-medium text-[11px] text-text-tertiary transition-colors hover:border-red/40 hover:text-red"
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
			<span className="w-16 shrink-0 font-mono text-[10px] text-text-tertiary uppercase tracking-[0.14em]">
				{label}
			</span>
			{children}
		</div>
	);
}
