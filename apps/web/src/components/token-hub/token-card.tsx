"use client";

import type { TokenHubCache } from "@forja/db";
import { ArrowRightLeftIcon, CoinsIcon, UsersIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { AddressDisplay } from "@/components/ui/address-display";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/format";
import { TokenCardBadges } from "./trust-badges";

const formatter = new Intl.NumberFormat("en-US");

interface TokenCardProps {
	token: TokenHubCache & { creatorDisplayName?: string | null };
	action?: React.ReactNode;
}

export function TokenCard({ token, action }: TokenCardProps) {
	return (
		<Link href={`/tokens/${token.address}`}>
			<Card className="border-anvil-gray-light bg-deep-charcoal transition-colors hover:border-indigo/50">
				<CardContent className="p-4">
					<div className="flex items-start justify-between gap-2">
						<div className="flex items-center gap-3">
							{token.logoUri ? (
								<Image
									src={token.logoUri}
									alt={token.symbol}
									width={40}
									height={40}
									className="rounded-full"
								/>
							) : (
								<div className="flex size-10 items-center justify-center rounded-full bg-anvil-gray">
									<CoinsIcon className="size-5 text-smoke-dark" />
								</div>
							)}
							<div>
								<h3 className="text-sm font-semibold text-steel-white">{token.name}</h3>
								<p className="text-xs text-smoke-dark">
									{token.symbol}
									{token.creatorDisplayName && (
										<span className="text-smoke-dark/60"> by {token.creatorDisplayName}</span>
									)}
								</p>
							</div>
						</div>
						<div className="flex items-start gap-2">
							<TokenCardBadges
								isForjaCreated={token.isForjaCreated}
								isLaunchpadToken={token.isLaunchpadToken}
								topHolderPct={token.topHolderPct}
							/>
							{action}
						</div>
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
						{token.isForjaCreated ? "Created" : "Listed"} {formatDate(token.createdAt)}
					</p>
				</CardContent>
			</Card>
		</Link>
	);
}
