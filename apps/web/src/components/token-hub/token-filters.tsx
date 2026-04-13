"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SortOption = "newest" | "oldest" | "holders" | "transfers";

interface TokenFiltersProps {
	sort: SortOption;
	onSortChange: (sort: SortOption) => void;
	forjaOnly: boolean;
	onForjaOnlyChange: (value: boolean) => void;
}

const sortOptions: { value: SortOption; label: string }[] = [
	{ value: "newest", label: "Newest" },
	{ value: "holders", label: "Most Holders" },
	{ value: "transfers", label: "Most Active" },
	{ value: "oldest", label: "Oldest" },
];

export function TokenFilters({
	sort,
	onSortChange,
	forjaOnly,
	onForjaOnlyChange,
}: TokenFiltersProps) {
	return (
		<div className="flex flex-wrap items-center gap-3">
			<select
				value={sort}
				onChange={(e) => onSortChange(e.target.value as SortOption)}
				className="h-9 rounded-md border border-anvil-gray-light bg-obsidian-black/50 px-3 text-sm text-smoke outline-none focus:border-indigo"
			>
				{sortOptions.map((opt) => (
					<option key={opt.value} value={opt.value}>
						{opt.label}
					</option>
				))}
			</select>
			<Button
				variant="outline"
				size="sm"
				onClick={() => onForjaOnlyChange(!forjaOnly)}
				className={cn(
					"border-anvil-gray-light text-smoke",
					forjaOnly && "border-indigo bg-indigo/10 text-indigo",
				)}
			>
				FORJA Only
			</Button>
		</div>
	);
}
