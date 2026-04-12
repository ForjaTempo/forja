"use client";

import type { LaunchListItem } from "@/actions/launches";
import { LaunchCard } from "@/components/launch/launch-card";
import { Button } from "@/components/ui/button";
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
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{Array.from({ length: 6 }).map((_, i) => (
					<Skeleton key={`skel-${i.toString()}`} className="h-48 rounded-lg" />
				))}
			</div>
		);
	}

	if (launches.length === 0) {
		return (
			<div className="py-16 text-center">
				<p className="text-sm text-smoke-dark">No launches found</p>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{launches.map((launch) => (
					<LaunchCard key={launch.id} launch={launch} />
				))}
			</div>
			{hasMore && (
				<div className="flex justify-center">
					<Button
						variant="outline"
						onClick={onLoadMore}
						disabled={isLoading}
						className="border-anvil-gray-light text-smoke"
					>
						{isLoading ? "Loading..." : `Load More (${launches.length} of ${total})`}
					</Button>
				</div>
			)}
		</div>
	);
}
