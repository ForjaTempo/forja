"use client";

import type { TokenHubCache } from "@forja/db";
import type { TokenEnriched } from "@/actions/token-hub";
import { TokenCard } from "./token-card";

interface CreatorTokensProps {
	tokens: TokenHubCache[];
}

function toEnriched(token: TokenHubCache): TokenEnriched {
	return {
		...token,
		creatorDisplayName: null,
		holderDelta7d: null,
		transfers24h: 0,
		currentPrice: null,
		trendingScore: 0,
		launchDbId: null,
	};
}

export function CreatorTokens({ tokens }: CreatorTokensProps) {
	if (tokens.length === 0) {
		return (
			<div className="py-12 text-center">
				<p className="text-sm text-smoke-dark">No tokens created</p>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<h2 className="text-lg font-semibold text-steel-white">Created Tokens</h2>
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{tokens.map((token) => (
					<TokenCard key={token.address} token={toEnriched(token)} />
				))}
			</div>
		</div>
	);
}
