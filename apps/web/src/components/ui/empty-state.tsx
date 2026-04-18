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
				"flex flex-col items-center justify-center rounded-2xl border border-dashed border-border-subtle bg-bg-elevated/50 px-6 py-12 text-center",
				className,
			)}
		>
			{icon && <div className="mb-3 text-text-tertiary">{icon}</div>}
			<h3 className="font-display text-[18px] tracking-[-0.01em] text-text-primary">{title}</h3>
			{description && (
				<p className="mt-1.5 max-w-sm text-[13px] text-text-tertiary">{description}</p>
			)}
			{action && <div className="mt-5">{action}</div>}
		</div>
	);
}

export { EmptyState, type EmptyStateProps };
