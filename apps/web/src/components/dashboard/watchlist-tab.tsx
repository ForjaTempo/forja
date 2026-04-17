"use client";

import type { TokenHubCache } from "@forja/db";
import {
	ArrowRightLeftIcon,
	EyeIcon,
	TrendingDownIcon,
	TrendingUpIcon,
	UsersIcon,
} from "lucide-react";
import Link from "next/link";
import type { TokenEnriched } from "@/actions/token-hub";
import { TokenCard } from "@/components/token-hub/token-card";
import { WatchlistButton } from "@/components/token-hub/watchlist-button";
import { Button } from "@/components/ui/button";

type WatchlistToken = TokenHubCache & { holderDelta: number; transfers7d: number };

function toEnriched(token: WatchlistToken): TokenEnriched {
	return {
		...token,
		creatorDisplayName: null,
		holderDelta7d: token.holderDelta,
		transfers24h: 0,
		currentPrice: null,
		trendingScore: 0,
		launchDbId: null,
	};
}

interface WatchlistTabProps {
	tokens: WatchlistToken[];
}

const formatter = new Intl.NumberFormat("en-US");

export function WatchlistTab({ tokens }: WatchlistTabProps) {
	if (tokens.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center gap-4 py-12">
				<EyeIcon className="size-10 text-smoke-dark" />
				<p className="text-sm text-smoke-dark">No watched tokens</p>
				<Link href="/tokens">
					<Button
						variant="outline"
						size="sm"
						className="border-anvil-gray-light text-smoke hover:text-steel-white"
					>
						Browse Token Hub
					</Button>
				</Link>
			</div>
		);
	}

	return (
		<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
			{tokens.map((token) => (
				<div key={token.address} className="space-y-0">
					<TokenCard
						token={toEnriched(token)}
						action={<WatchlistButton tokenAddress={token.address} />}
					/>
					<div className="flex items-center gap-4 rounded-b-lg border border-t-0 border-anvil-gray-light bg-deep-charcoal/50 px-4 py-2 text-xs text-smoke-dark">
						<span className="inline-flex items-center gap-1">
							<UsersIcon className="size-3" />
							7d:
							{token.holderDelta > 0 ? (
								<span className="inline-flex items-center gap-0.5 text-emerald-400">
									<TrendingUpIcon className="size-3" />+{formatter.format(token.holderDelta)}
								</span>
							) : token.holderDelta < 0 ? (
								<span className="inline-flex items-center gap-0.5 text-red-400">
									<TrendingDownIcon className="size-3" />
									{formatter.format(token.holderDelta)}
								</span>
							) : (
								<span>0</span>
							)}
						</span>
						<span className="inline-flex items-center gap-1">
							<ArrowRightLeftIcon className="size-3" />
							{formatter.format(token.transfers7d)} transfers (7d)
						</span>
					</div>
				</div>
			))}
		</div>
	);
}
