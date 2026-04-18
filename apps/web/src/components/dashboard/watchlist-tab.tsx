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
			<div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-border-hair bg-bg-elevated py-16">
				<EyeIcon className="size-10 text-text-tertiary" />
				<p className="text-[13px] text-text-tertiary">No watched tokens yet.</p>
				<Link
					href="/tokens"
					className="inline-flex items-center gap-2 rounded-xl border border-border-hair bg-bg-field px-4 py-2 text-[12px] font-medium text-text-secondary transition-colors hover:border-border-subtle hover:text-text-primary"
				>
					Browse token hub
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
					<div className="flex items-center gap-4 rounded-b-2xl border border-t-0 border-border-hair bg-bg-field/60 px-4 py-2 text-[11.5px] text-text-tertiary">
						<span className="inline-flex items-center gap-1">
							<UsersIcon className="size-3" />
							7d
							{token.holderDelta > 0 ? (
								<span className="inline-flex items-center gap-0.5 text-green">
									<TrendingUpIcon className="size-3" />+{formatter.format(token.holderDelta)}
								</span>
							) : token.holderDelta < 0 ? (
								<span className="inline-flex items-center gap-0.5 text-red">
									<TrendingDownIcon className="size-3" />
									{formatter.format(token.holderDelta)}
								</span>
							) : (
								<span>0</span>
							)}
						</span>
						<span className="inline-flex items-center gap-1">
							<ArrowRightLeftIcon className="size-3" />
							{formatter.format(token.transfers7d)} tx · 7d
						</span>
					</div>
				</div>
			))}
		</div>
	);
}
