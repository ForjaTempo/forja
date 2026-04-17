"use client";

import { ArrowLeftRightIcon, ExternalLinkIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { formatUnits } from "viem";
import { useAccount } from "wagmi";
import { getSwapHistory, type SwapRow } from "@/actions/swaps";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useExplorerUrl } from "@/hooks/use-explorer-url";
import { TIP20_DECIMALS } from "@/lib/constants";

const TRUNCATE = (addr: string) => `${addr.slice(0, 6)}…${addr.slice(-4)}`;

export function SwapsHistory() {
	const { address } = useAccount();
	const explorer = useExplorerUrl();
	const [swaps, setSwaps] = useState<SwapRow[]>([]);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		if (!address) {
			setSwaps([]);
			setIsLoading(false);
			return;
		}
		let cancelled = false;
		(async () => {
			setIsLoading(true);
			try {
				const result = await getSwapHistory({ user: address, limit: 50 });
				if (!cancelled) setSwaps(result.swaps);
			} finally {
				if (!cancelled) setIsLoading(false);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [address]);

	if (isLoading) {
		return (
			<div className="space-y-3">
				{Array.from({ length: 4 }).map((_, i) => (
					<Skeleton key={`s-${i.toString()}`} className="h-16 rounded-lg" />
				))}
			</div>
		);
	}

	if (swaps.length === 0) {
		return (
			<EmptyState
				icon={<ArrowLeftRightIcon className="size-8" />}
				title="No swaps yet"
				description="Trades you make through the FORJA swap router will appear here."
			/>
		);
	}

	const totalVolume = swaps.reduce((acc, s) => acc + BigInt(s.amountIn), 0n);
	const totalFees = swaps.reduce((acc, s) => acc + BigInt(s.feeAmount), 0n);

	return (
		<div className="space-y-3">
			<div className="grid grid-cols-3 gap-3 text-xs">
				<StatCard label="Total swaps" value={swaps.length.toString()} />
				<StatCard label="Total in (raw)" value={formatUnits(totalVolume, TIP20_DECIMALS)} />
				<StatCard label="Fees paid (raw)" value={formatUnits(totalFees, TIP20_DECIMALS)} />
			</div>

			<Card className="border-anvil-gray-light bg-deep-charcoal">
				<CardContent className="p-0">
					<ul className="divide-y divide-anvil-gray-light">
						{swaps.map((s) => (
							<li
								key={`${s.txHash}-${s.logIndex}`}
								className="flex items-center justify-between px-4 py-3 text-xs"
							>
								<div className="min-w-0">
									<p className="truncate text-steel-white">
										{formatUnits(BigInt(s.amountIn), TIP20_DECIMALS)} {TRUNCATE(s.tokenIn)} →{" "}
										{formatUnits(BigInt(s.amountOut), TIP20_DECIMALS)} {TRUNCATE(s.tokenOut)}
									</p>
									<p className="text-smoke-dark">
										{new Date(s.createdAt).toLocaleString()} · fee{" "}
										{formatUnits(BigInt(s.feeAmount), TIP20_DECIMALS)}
									</p>
								</div>
								<a
									href={`${explorer}/tx/${s.txHash}`}
									target="_blank"
									rel="noopener noreferrer"
									className="ml-3 shrink-0 text-smoke-dark hover:text-indigo"
								>
									<ExternalLinkIcon className="size-3.5" />
								</a>
							</li>
						))}
					</ul>
				</CardContent>
			</Card>
		</div>
	);
}

function StatCard({ label, value }: { label: string; value: string }) {
	return (
		<Card className="border-anvil-gray-light bg-deep-charcoal">
			<CardContent className="p-3">
				<p className="text-smoke-dark">{label}</p>
				<p className="mt-1 truncate font-mono text-sm text-steel-white">{value}</p>
			</CardContent>
		</Card>
	);
}
