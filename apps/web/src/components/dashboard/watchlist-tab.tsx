"use client";

import type { TokenHubCache } from "@forja/db";
import { EyeIcon } from "lucide-react";
import Link from "next/link";
import { TokenCard } from "@/components/token-hub/token-card";
import { WatchlistButton } from "@/components/token-hub/watchlist-button";
import { Button } from "@/components/ui/button";

interface WatchlistTabProps {
	tokens: TokenHubCache[];
}

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
				<TokenCard
					key={token.address}
					token={token}
					action={<WatchlistButton tokenAddress={token.address} />}
				/>
			))}
		</div>
	);
}
