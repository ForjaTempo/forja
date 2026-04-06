import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface ChartWrapperProps {
	title: string;
	loading: boolean;
	children: ReactNode;
}

export function ChartWrapper({ title, loading, children }: ChartWrapperProps) {
	return (
		<div className="rounded-lg border border-anvil-gray-light bg-obsidian-black/50 p-4">
			<h3 className="mb-4 text-sm font-medium text-smoke-dark">{title}</h3>
			{loading ? (
				<Skeleton className="h-64 w-full" />
			) : (
				<div className="h-64 w-full">{children}</div>
			)}
		</div>
	);
}

export const CHART_TOOLTIP_STYLE = {
	backgroundColor: "#1a1a1a",
	border: "1px solid #333",
	borderRadius: "8px",
} as const;
