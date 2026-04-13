import { ArrowDownIcon, ArrowUpIcon } from "lucide-react";
import type * as React from "react";

import { cn } from "@/lib/utils";
import { Skeleton } from "./skeleton";

type StatFormat = "number" | "currency" | "compact" | "percent";

interface StatCardProps {
	label: string;
	value: number | string;
	format?: StatFormat;
	delta?: number;
	icon?: React.ReactNode;
	loading?: boolean;
	className?: string;
}

function formatStatValue(value: number | string, format: StatFormat): string {
	if (typeof value === "string") return value;

	switch (format) {
		case "currency":
			return new Intl.NumberFormat("en-US", {
				style: "currency",
				currency: "USD",
				minimumFractionDigits: 2,
				maximumFractionDigits: 2,
			}).format(value);
		case "compact":
			return new Intl.NumberFormat("en-US", {
				notation: "compact",
				maximumFractionDigits: 1,
			}).format(value);
		case "percent":
			return `${value.toFixed(1)}%`;
		default:
			return new Intl.NumberFormat("en-US").format(value);
	}
}

function StatCard({
	label,
	value,
	format = "number",
	delta,
	icon,
	loading,
	className,
}: StatCardProps) {
	if (loading) {
		return (
			<div className={cn("rounded-xl border border-border-subtle bg-surface-card p-4", className)}>
				<Skeleton className="mb-2 h-4 w-20" />
				<Skeleton className="h-8 w-28" />
			</div>
		);
	}

	return (
		<div className={cn("rounded-xl border border-border-subtle bg-surface-card p-4", className)}>
			<div className="flex items-center justify-between">
				<p className="text-sm text-smoke">{label}</p>
				{icon && <span className="text-smoke-dark">{icon}</span>}
			</div>
			<div className="mt-1 flex items-baseline gap-2">
				<p className="font-mono text-2xl font-semibold text-steel-white">
					{formatStatValue(value, format)}
				</p>
				{delta !== undefined && delta !== 0 && (
					<span
						className={cn(
							"inline-flex items-center gap-0.5 text-xs font-medium",
							delta > 0 ? "text-forge-green" : "text-ember-red",
						)}
					>
						{delta > 0 ? <ArrowUpIcon className="size-3" /> : <ArrowDownIcon className="size-3" />}
						{Math.abs(delta).toFixed(1)}%
					</span>
				)}
			</div>
		</div>
	);
}

export { StatCard, type StatCardProps };
