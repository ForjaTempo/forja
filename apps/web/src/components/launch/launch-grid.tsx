"use client";

import type { LaunchListItem } from "@/actions/launches";
import { LaunchCard } from "@/components/launch/launch-card";
import { Skeleton } from "@/components/ui/skeleton";

interface LaunchGridProps {
	launches: LaunchListItem[];
	total: number;
	isLoading: boolean;
	hasMore: boolean;
	onLoadMore: () => void;
}

export function LaunchGrid({ launches, total, isLoading, hasMore, onLoadMore }: LaunchGridProps) {
	if (isLoading && launches.length === 0) {
		return (
			<div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
				{Array.from({ length: 6 }).map((_, i) => (
					<Skeleton key={`skel-${i.toString()}`} className="h-[280px] rounded-2xl" />
				))}
			</div>
		);
	}

	if (launches.length === 0) {
		return (
			<div className="rounded-2xl border border-border-hair bg-bg-elevated py-20 text-center">
				<div className="font-mono text-[11px] text-text-tertiary uppercase tracking-[0.14em]">
					Nothing here yet
				</div>
				<p className="mt-3 font-display text-[28px] text-text-secondary tracking-[-0.02em]">
					No launches match the filter.
				</p>
				<p className="mt-2 text-sm text-text-tertiary">Try clearing tags or switch tab.</p>
			</div>
		);
	}

	return (
		<div className="space-y-8">
			<div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
				{launches.map((launch) => (
					<LaunchCard key={launch.id} launch={launch} />
				))}
			</div>
			{hasMore && (
				<div className="flex justify-center">
					<button
						type="button"
						onClick={onLoadMore}
						disabled={isLoading}
						className="inline-flex items-center gap-2 rounded-xl border border-border-hair bg-bg-elevated px-5 py-3 font-mono text-[12px] text-text-secondary uppercase tracking-[0.12em] transition-colors hover:border-border-subtle hover:text-text-primary disabled:opacity-50"
					>
						{isLoading
							? "Loading…"
							: `Load more · ${launches.length.toLocaleString()} of ${total.toLocaleString()}`}
					</button>
				</div>
			)}
		</div>
	);
}
