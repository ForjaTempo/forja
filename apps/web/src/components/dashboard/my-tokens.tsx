"use client";

import { ArrowDownIcon, ArrowUpIcon, CoinsIcon, UsersIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { TokenWithStats } from "@/actions/dashboard";

const formatter = new Intl.NumberFormat("en-US");

interface MyTokensProps {
	tokens: TokenWithStats[];
	onSelectToken: (address: string) => void;
}

export function MyTokens({ tokens, onSelectToken }: MyTokensProps) {
	if (tokens.length === 0) {
		return (
			<div className="py-12 text-center">
				<CoinsIcon className="mx-auto mb-3 size-8 text-smoke-dark" />
				<p className="text-sm text-smoke-dark">No tokens yet</p>
				<Link
					href="/create"
					className="mt-3 inline-block rounded-md bg-molten-amber px-4 py-2 text-sm font-medium text-forge-black transition-colors hover:bg-molten-amber/90"
				>
					Create your first token
				</Link>
			</div>
		);
	}

	return (
		<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
			{tokens.map((token) => (
				<button
					key={token.address}
					type="button"
					onClick={() => onSelectToken(token.address)}
					className="rounded-lg border border-anvil-gray-light bg-obsidian-black/50 p-4 text-left transition-colors hover:border-molten-amber/50"
				>
					<div className="flex items-center justify-between">
						<div>
							<p className="font-medium text-steel-white">{token.name}</p>
							<p className="text-xs text-smoke-dark">{token.symbol}</p>
						</div>
						{token.logoUri && (
							<Image
								src={token.logoUri}
								alt={token.symbol}
								width={32}
								height={32}
								className="rounded-full"
								unoptimized
							/>
						)}
					</div>

					<div className="mt-3 grid grid-cols-2 gap-2">
						<div>
							<p className="flex items-center gap-1 text-xs text-smoke-dark">
								<UsersIcon className="size-3" />
								Holders
							</p>
							<p className="font-mono text-sm text-steel-white">
								{formatter.format(token.holderCount)}
							</p>
						</div>
						<div>
							<p className="text-xs text-smoke-dark">7d Transfers</p>
							<p className="font-mono text-sm text-steel-white">
								{formatter.format(token.recentTransfers)}
							</p>
						</div>
					</div>

					{token.holderDelta !== 0 && (
						<div className="mt-2 flex items-center gap-1 text-xs">
							{token.holderDelta > 0 ? (
								<>
									<ArrowUpIcon className="size-3 text-emerald-400" />
									<span className="text-emerald-400">+{token.holderDelta} holders (7d)</span>
								</>
							) : (
								<>
									<ArrowDownIcon className="size-3 text-red-400" />
									<span className="text-red-400">{token.holderDelta} holders (7d)</span>
								</>
							)}
						</div>
					)}
				</button>
			))}
		</div>
	);
}
