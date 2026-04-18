"use client";

import { ArrowDownIcon, ArrowUpIcon, CoinsIcon, UsersIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { TokenWithStats } from "@/actions/dashboard";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ImageFallback } from "@/components/ui/image-fallback";

const formatter = new Intl.NumberFormat("en-US");

interface MyTokensProps {
	tokens: TokenWithStats[];
	onSelectToken: (address: string) => void;
}

export function MyTokens({ tokens, onSelectToken }: MyTokensProps) {
	if (tokens.length === 0) {
		return (
			<EmptyState
				icon={<CoinsIcon className="size-8" />}
				title="No tokens yet"
				description="Deploy your first TIP-20 token to get started."
				action={
					<Link href="/create">
						<Button
							className="inline-flex items-center gap-2.5 rounded-xl px-6 py-3.5 font-semibold text-[15px] text-[#1a1307] transition-transform hover:-translate-y-0.5"
							style={{
								background: "linear-gradient(135deg, #ffe5a8, #f0d38a 50%, #e8b860)",
								boxShadow: "0 4px 30px rgba(240,211,138,0.3), inset 0 1px 0 rgba(255,255,255,0.5)",
							}}
						>
							Create your first token
						</Button>
					</Link>
				}
			/>
		);
	}

	return (
		<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{tokens.map((token) => (
				<button
					key={token.address}
					type="button"
					onClick={() => onSelectToken(token.address)}
					className="group rounded-2xl border border-border-hair bg-bg-elevated p-5 text-left transition-all hover:-translate-y-0.5 hover:border-border-subtle"
				>
					<div className="flex items-center gap-3">
						{token.logoUri ? (
							<Image
								src={token.logoUri}
								alt={token.symbol}
								width={44}
								height={44}
								className="size-11 rounded-full"
								unoptimized
							/>
						) : (
							<ImageFallback name={token.symbol} size={44} variant="circle" />
						)}
						<div className="min-w-0 flex-1">
							<p className="truncate font-display text-[22px] tracking-[-0.02em] text-text-primary">
								{token.symbol}
							</p>
							<p className="truncate text-xs text-text-tertiary">{token.name}</p>
						</div>
					</div>

					<div className="mt-5 grid grid-cols-2 gap-3 border-t border-border-hair pt-4">
						<div>
							<p className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.1em] text-text-tertiary">
								<UsersIcon className="size-3" />
								Holders
							</p>
							<p className="mt-1 font-mono text-sm text-text-primary">
								{formatter.format(token.holderCount)}
							</p>
						</div>
						<div>
							<p className="font-mono text-[10px] uppercase tracking-[0.1em] text-text-tertiary">
								7d Transfers
							</p>
							<p className="mt-1 font-mono text-sm text-text-primary">
								{formatter.format(token.recentTransfers)}
							</p>
						</div>
					</div>

					{token.holderDelta !== 0 && (
						<div className="mt-3 flex items-center gap-1 font-mono text-xs">
							{token.holderDelta > 0 ? (
								<>
									<ArrowUpIcon className="size-3 text-green" />
									<span className="text-green">+{token.holderDelta} holders (7d)</span>
								</>
							) : (
								<>
									<ArrowDownIcon className="size-3 text-red" />
									<span className="text-red">{token.holderDelta} holders (7d)</span>
								</>
							)}
						</div>
					)}
				</button>
			))}
		</div>
	);
}
