"use client";

import type { TokenEnriched } from "@/actions/token-hub";
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
					<Skeleton key={`skel-${i.toString()}`} className="h-44 rounded-2xl" />
				))}
			</div>
		);
	}

	if (tokens.length === 0) {
		return (
			<div className="rounded-2xl border border-border-hair bg-bg-elevated py-16 text-center">
				<p className="text-[13px] text-text-tertiary">No tokens found.</p>
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
					<button
						type="button"
						onClick={onLoadMore}
						disabled={isLoading}
						className="inline-flex items-center gap-2 rounded-xl border border-border-hair bg-bg-elevated px-5 py-2.5 font-medium text-[13px] text-text-secondary transition-colors hover:border-border-subtle hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-60"
					>
						{isLoading
							? "Loading…"
							: `Load more · ${tokens.length.toLocaleString()} of ${total.toLocaleString()}`}
					</button>
				</div>
			)}
		</div>
	);
}
