import type * as React from "react";

import { cn } from "@/lib/utils";

interface FilterChipProps {
	active?: boolean;
	children: React.ReactNode;
	onClick?: () => void;
	className?: string;
}

function FilterChip({ active, children, onClick, className }: FilterChipProps) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
				active
					? "border-indigo bg-indigo/10 text-indigo"
					: "border-border-subtle bg-surface-field text-smoke hover:text-steel-white",
				className,
			)}
		>
			{children}
		</button>
	);
}

export { FilterChip, type FilterChipProps };
