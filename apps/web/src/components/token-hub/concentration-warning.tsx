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
				border: "border-red-500/30",
				bg: "from-red-500/10 via-red-500/5 to-transparent",
				iconBg: "bg-red-500/20 text-red-400",
				title: "text-red-400",
			}
		: {
				border: "border-molten-amber/30",
				bg: "from-molten-amber/10 via-molten-amber/5 to-transparent",
				iconBg: "bg-molten-amber/20 text-molten-amber",
				title: "text-molten-amber",
			};

	return (
		<ScrollReveal>
			<div
				className={cn(
					"overflow-hidden rounded-xl border bg-gradient-to-r p-4 sm:p-5",
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
						<h3 className={cn("text-sm font-semibold", tone.title)}>
							{isHigh ? "Highly concentrated supply" : "Concentrated supply"}
						</h3>
						<p className="mt-0.5 text-xs text-smoke">
							Top 10 holders control <strong>{topHolderPct}%</strong> of the supply. Large transfers
							by these wallets can move price or drain liquidity rapidly.
						</p>
					</div>
				</div>
			</div>
		</ScrollReveal>
	);
}
