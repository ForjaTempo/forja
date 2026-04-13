import type * as React from "react";

import { cn } from "@/lib/utils";

interface SectionShellProps {
	title: string;
	description?: string;
	action?: React.ReactNode;
	children: React.ReactNode;
	className?: string;
}

function SectionShell({ title, description, action, children, className }: SectionShellProps) {
	return (
		<section className={cn("space-y-4", className)}>
			<div className="flex items-start justify-between gap-4">
				<div>
					<h2 className="text-lg font-semibold text-steel-white">{title}</h2>
					{description && <p className="mt-0.5 text-sm text-smoke-dark">{description}</p>}
				</div>
				{action && <div className="shrink-0">{action}</div>}
			</div>
			{children}
		</section>
	);
}

export { SectionShell, type SectionShellProps };
