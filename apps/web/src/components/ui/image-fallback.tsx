"use client";

import { cn } from "@/lib/utils";

interface ImageFallbackProps {
	name: string;
	size?: number;
	variant?: "square" | "circle";
	className?: string;
}

// Deterministic palette — each token address/name maps to one gradient so the
// same token always shows the same color, but 979 external tokens don't all
// look identical. All gradients stay within the Tempo-native palette and keep
// white text contrast >= 4.5:1 (WCAG AA).
const PALETTE = [
	"from-indigo to-indigo-dimmed",
	"from-forge-green/80 to-forge-green/40",
	"from-purple-500 to-purple-800",
	"from-sky-500 to-blue-800",
	"from-orange-500/80 to-amber-700",
	"from-pink-500/80 to-pink-800",
	"from-teal-500/80 to-teal-800",
	"from-rose-500/80 to-red-800",
	"from-violet-500/80 to-indigo-700",
	"from-cyan-500/80 to-sky-800",
] as const;

function gradientFor(seed: string): string {
	let hash = 0;
	for (let i = 0; i < seed.length; i++) {
		hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
	}
	return PALETTE[Math.abs(hash) % PALETTE.length] as string;
}

export function ImageFallback({
	name,
	size = 40,
	variant = "square",
	className,
}: ImageFallbackProps) {
	const letter = (name || "?").charAt(0).toUpperCase();
	const fontSize = Math.max(12, Math.round(size * 0.4));
	const gradient = gradientFor(name || "?");

	return (
		<div
			className={cn(
				"flex items-center justify-center bg-gradient-to-br text-white font-semibold shrink-0",
				gradient,
				variant === "circle" ? "rounded-full" : "rounded-lg",
				className,
			)}
			style={{ width: size, height: size, fontSize }}
		>
			{letter}
		</div>
	);
}
