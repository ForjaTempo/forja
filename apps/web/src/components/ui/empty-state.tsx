import type * as React from "react";

import { cn } from "@/lib/utils";

interface EmptyStateProps {
	icon?: React.ReactNode;
	title: string;
	description?: string;
	action?: React.ReactNode;
	className?: string;
}

function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
	return (
		<div
			className={cn(
				"flex flex-col items-center justify-center rounded-xl border border-dashed border-border-subtle px-6 py-12 text-center",
				className,
			)}
		>
			{icon && <div className="mb-3 text-smoke-dark">{icon}</div>}
			<h3 className="text-sm font-medium text-steel-white">{title}</h3>
			{description && (
				<p className="mt-1 max-w-sm text-sm text-smoke-dark">{description}</p>
			)}
			{action && <div className="mt-4">{action}</div>}
		</div>
	);
}

export { EmptyState, type EmptyStateProps };
