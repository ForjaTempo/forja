import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface ChartWrapperProps {
	title: string;
	loading: boolean;
	children: ReactNode;
}

export function ChartWrapper({ title, loading, children }: ChartWrapperProps) {
	return (
		<div className="rounded-2xl border border-border-hair bg-bg-elevated p-5">
			<h3 className="mb-4 font-mono text-[10px] text-text-tertiary uppercase tracking-[0.14em]">
				{title}
			</h3>
			{loading ? (
				<Skeleton className="h-64 w-full rounded-xl" />
			) : (
				<div className="h-64 w-full">{children}</div>
			)}
		</div>
	);
}

export const CHART_TOOLTIP_STYLE = {
	backgroundColor: "rgba(16,16,24,0.95)",
	border: "1px solid rgba(255,255,255,0.09)",
	borderRadius: "12px",
	fontSize: "12px",
} as const;
