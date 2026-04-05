"use client";

import type { TokenHubCache } from "@forja/db";
import { AlertTriangleIcon, ArrowRightLeftIcon, CoinsIcon, UsersIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { AddressDisplay } from "@/components/ui/address-display";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
								<p className="text-xs text-smoke-dark">{token.symbol}</p>
							</div>
						</div>
						<div className="flex flex-col items-end gap-1">
							{token.isForjaCreated && (
								<Badge className="bg-molten-amber/15 text-molten-amber border-molten-amber/30">
									FORJA
								</Badge>
							)}
							{token.topHolderPct > 50 && (
								<Badge className="bg-red-500/15 text-red-400 border-red-500/30 inline-flex items-center gap-1">
									<AlertTriangleIcon className="size-2.5" />
									{token.topHolderPct}%
								</Badge>
							)}
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
