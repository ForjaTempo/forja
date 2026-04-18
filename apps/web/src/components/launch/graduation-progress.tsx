"use client";

import { TrophyIcon } from "lucide-react";
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
			<div className="flex flex-col items-center gap-3 rounded-2xl border border-green/25 bg-green/5 p-6 text-center">
				<div className="flex size-11 items-center justify-center rounded-xl border border-green/30 bg-green/10 text-green">
					<TrophyIcon className="size-5" />
				</div>
				<div className="font-display text-[20px] text-green tracking-[-0.02em]">Graduated</div>
				<p className="text-[12.5px] text-text-tertiary">
					Liquidity migrated permanently to Uniswap v4.
				</p>
			</div>
		);
	}

	return (
		<div className="rounded-2xl border border-border-hair bg-bg-elevated p-5">
			<div className="font-mono text-[11px] text-text-tertiary uppercase tracking-[0.14em]">
				Graduation progress
			</div>
			<div className="mt-3 flex items-baseline justify-between">
				<div className="font-display text-[26px] tracking-[-0.02em]" style={{ color: "#f472b6" }}>
					{progressPct.toFixed(1)}%
				</div>
				<div className="font-mono text-[11px] text-text-tertiary">${raisedFormatted} / $69,000</div>
			</div>
			<div className="mt-4 h-1 overflow-hidden rounded-full bg-bg-field">
				<div
					className="h-full rounded-full"
					style={{
						width: `${progressPct}%`,
						background: "linear-gradient(90deg, #f472b6, #a78bfa)",
						boxShadow: "0 0 8px rgba(244,114,182,0.6)",
					}}
				/>
			</div>
			<div className="mt-5 grid grid-cols-2 gap-3 border-border-hair border-t pt-4">
				<div>
					<div className="font-mono text-[10px] text-text-tertiary uppercase tracking-[0.14em]">
						Trades
					</div>
					<div className="mt-1 font-display text-[20px] tracking-[-0.02em]">
						{tradeCount.toLocaleString()}
					</div>
				</div>
				<div>
					<div className="font-mono text-[10px] text-text-tertiary uppercase tracking-[0.14em]">
						Traders
					</div>
					<div className="mt-1 font-display text-[20px] tracking-[-0.02em]">
						{uniqueTraders.toLocaleString()}
					</div>
				</div>
			</div>
		</div>
	);
}
