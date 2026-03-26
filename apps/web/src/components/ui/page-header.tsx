import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
	title: string;
	description?: string;
	action?: ReactNode;
	className?: string;
}

export function PageHeader({ title, description, action, className }: PageHeaderProps) {
	return (
		<div
			className={cn(
				"flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between",
				className,
			)}
		>
			<div>
				<h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
				{description && <p className="mt-1 text-sm text-smoke-dark">{description}</p>}
			</div>
			{action && <div className="mt-4 sm:mt-0">{action}</div>}
		</div>
	);
}
