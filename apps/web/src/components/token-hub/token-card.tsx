"use client";

import { CoinsIcon, UsersIcon, ArrowRightLeftIcon } from "lucide-react";
import Link from "next/link";
import type { TokenHubCache } from "@forja/db";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { AddressDisplay } from "@/components/ui/address-display";
import { formatDate } from "@/lib/format";

const formatter = new Intl.NumberFormat("en-US");

interface TokenCardProps {
	token: TokenHubCache;
}

export function TokenCard({ token }: TokenCardProps) {
	return (
		<Link href={`/tokens/${token.address}`}>
			<Card className="border-anvil-gray-light bg-deep-charcoal transition-colors hover:border-molten-amber/50">
				<CardContent className="p-4">
					<div className="flex items-start justify-between gap-2">
						<div className="flex items-center gap-3">
							{token.logoUri ? (
								<img
									src={token.logoUri}
									alt={token.symbol}
									className="size-10 rounded-full"
								/>
							) : (
								<div className="flex size-10 items-center justify-center rounded-full bg-anvil-gray">
									<CoinsIcon className="size-5 text-smoke-dark" />
								</div>
							)}
							<div>
								<h3 className="text-sm font-semibold text-steel-white">{token.name}</h3>
								<p className="text-xs text-smoke-dark">{token.symbol}</p>
							</div>
						</div>
						{token.isForjaCreated && (
							<Badge className="bg-molten-amber/15 text-molten-amber border-molten-amber/30">
								FORJA
							</Badge>
						)}
					</div>

					<div className="mt-3">
						<AddressDisplay address={token.address} />
					</div>

					<div className="mt-3 flex items-center gap-4 text-xs text-smoke-dark">
						<span className="inline-flex items-center gap-1">
							<UsersIcon className="size-3" />
							{formatter.format(token.holderCount)} holders
						</span>
						<span className="inline-flex items-center gap-1">
							<ArrowRightLeftIcon className="size-3" />
							{formatter.format(token.transferCount)} transfers
						</span>
					</div>

					<p className="mt-2 text-xs text-smoke-dark">
						{formatDate(token.createdAt)}
					</p>
				</CardContent>
			</Card>
		</Link>
	);
}
