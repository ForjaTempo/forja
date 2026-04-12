"use client";

import { TrophyIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TIP20_DECIMALS } from "@/lib/constants";

const GRADUATION_THRESHOLD = 69_000_000_000n;

interface GraduationProgressProps {
	realUsdcRaised: string;
	tradeCount: number;
	uniqueTraders: number;
	graduated: boolean;
}

export function GraduationProgress({
	realUsdcRaised,
	tradeCount,
	uniqueTraders,
	graduated,
}: GraduationProgressProps) {
	const raised = BigInt(realUsdcRaised);
	const progressPct = Math.min(100, Number((raised * 10000n) / GRADUATION_THRESHOLD) / 100);
	const raisedFormatted = (Number(raised) / 10 ** TIP20_DECIMALS).toLocaleString("en-US", {
		maximumFractionDigits: 2,
	});

	if (graduated) {
		return (
			<Card className="border-emerald-500/30 bg-emerald-500/5">
				<CardContent className="flex flex-col items-center gap-3 p-6">
					<TrophyIcon className="size-8 text-emerald-400" />
					<p className="font-semibold text-emerald-400">Graduated!</p>
					<p className="text-center text-xs text-smoke-dark">
						This token has graduated to Uniswap v4 with permanent liquidity.
					</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className="border-anvil-gray-light bg-deep-charcoal">
			<CardHeader className="pb-2">
				<CardTitle className="text-sm text-steel-white">Graduation Progress</CardTitle>
			</CardHeader>
			<CardContent className="space-y-3">
				<div className="flex items-center justify-between text-xs text-smoke-dark">
					<span>${raisedFormatted} raised</span>
					<span>${(69_000).toLocaleString()}</span>
				</div>
				<Progress value={progressPct} className="h-3" />
				<p className="text-center text-sm font-semibold text-molten-amber">
					{progressPct.toFixed(1)}%
				</p>

				<div className="grid grid-cols-2 gap-3 pt-2 text-center">
					<div>
						<p className="text-lg font-semibold text-steel-white">{tradeCount}</p>
						<p className="text-xs text-smoke-dark">Trades</p>
					</div>
					<div>
						<p className="text-lg font-semibold text-steel-white">{uniqueTraders}</p>
						<p className="text-xs text-smoke-dark">Traders</p>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
