"use client";

import type { TokenEnriched } from "@/actions/token-hub";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TokenCard } from "./token-card";

interface TokenGridProps {
	tokens: TokenEnriched[];
	total: number;
	isLoading: boolean;
	hasMore: boolean;
	onLoadMore: () => void;
}

export function TokenGrid({ tokens, total, isLoading, hasMore, onLoadMore }: TokenGridProps) {
	if (isLoading && tokens.length === 0) {
		return (
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{Array.from({ length: 6 }).map((_, i) => (
					<Skeleton key={`skel-${i.toString()}`} className="h-44 rounded-lg" />
				))}
			</div>
		);
	}

	if (tokens.length === 0) {
		return (
			<div className="py-16 text-center">
				<p className="text-sm text-smoke-dark">No tokens found</p>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{tokens.map((token) => (
					<TokenCard key={token.address} token={token} />
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
						{isLoading ? "Loading..." : `Load More (${tokens.length} of ${total})`}
					</Button>
				</div>
			)}
		</div>
	);
}
