"use client";

import { AlertTriangleIcon } from "lucide-react";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { cn } from "@/lib/utils";

interface ConcentrationWarningProps {
	topHolderPct: number;
}

export function ConcentrationWarning({ topHolderPct }: ConcentrationWarningProps) {
	if (topHolderPct < 40) return null;

	const isHigh = topHolderPct >= 60;
	const tone = isHigh
		? {
				border: "border-red/30",
				bg: "from-red/10 via-red/5 to-transparent",
				iconBg: "bg-red/20 text-red",
				title: "text-red",
			}
		: {
				border: "border-gold/30",
				bg: "from-gold/10 via-gold/5 to-transparent",
				iconBg: "bg-gold/15 text-gold",
				title: "text-gold",
			};

	return (
		<ScrollReveal>
			<div
				className={cn(
					"overflow-hidden rounded-2xl border bg-gradient-to-r p-4 sm:p-5",
					tone.border,
					tone.bg,
				)}
			>
				<div className="flex items-start gap-3">
					<div
						className={cn(
							"flex size-9 shrink-0 items-center justify-center rounded-full",
							tone.iconBg,
						)}
					>
						<AlertTriangleIcon className="size-4" />
					</div>
					<div className="min-w-0">
						<h3 className={cn("font-mono text-[11px] uppercase tracking-[0.14em]", tone.title)}>
							{isHigh ? "Highly concentrated supply" : "Concentrated supply"}
						</h3>
						<p className="mt-1 text-[13px] text-text-secondary">
							Top 10 holders control <strong className="text-text-primary">{topHolderPct}%</strong>{" "}
							of the supply. Large transfers by these wallets can move price or drain liquidity
							rapidly.
						</p>
					</div>
				</div>
			</div>
		</ScrollReveal>
	);
}
