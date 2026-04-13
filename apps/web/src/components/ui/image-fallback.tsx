"use client";

import { cn } from "@/lib/utils";

interface ImageFallbackProps {
	name: string;
	size?: number;
	variant?: "square" | "circle";
	className?: string;
}

export function ImageFallback({
	name,
	size = 40,
	variant = "square",
	className,
}: ImageFallbackProps) {
	const letter = (name || "?").charAt(0).toUpperCase();
	const fontSize = Math.max(12, Math.round(size * 0.4));

	return (
		<div
			className={cn(
				"flex items-center justify-center bg-gradient-to-br from-indigo to-indigo-dimmed text-white font-semibold shrink-0",
				variant === "circle" ? "rounded-full" : "rounded-lg",
				className,
			)}
			style={{ width: size, height: size, fontSize }}
		>
			{letter}
		</div>
	);
}
