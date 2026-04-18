import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Accent = "gold" | "green" | "indigo" | "ember";

interface ToolHeroProps {
	number: string;
	label: string;
	accent?: Accent;
	title: ReactNode;
	description?: ReactNode;
	aside?: ReactNode;
	className?: string;
}

/**
 * Shared forge-editorial hero used by the 4 tool pages (Create / Multisend /
 * Lock / Claim). Eyebrow badge with numbered tool id, large serif headline
 * with an italic accent word, and an optional right-side stat block.
 */
export function ToolHero({
	number,
	label,
	accent = "gold",
	title,
	description,
	aside,
	className,
}: ToolHeroProps) {
	const accentClasses: Record<Accent, { pill: string; badge: string; text: string }> = {
		gold: {
			pill: "bg-[rgba(240,211,138,0.08)] border-[rgba(240,211,138,0.2)] text-gold",
			badge: "bg-gold text-[#1a1307]",
			text: "text-gold",
		},
		green: {
			pill: "bg-[rgba(74,222,128,0.08)] border-[rgba(74,222,128,0.2)] text-green",
			badge: "bg-green text-[#052e16]",
			text: "text-green",
		},
		indigo: {
			pill: "bg-[rgba(129,140,248,0.08)] border-[rgba(129,140,248,0.2)] text-indigo",
			badge: "bg-indigo text-[#0b0b1a]",
			text: "text-indigo",
		},
		ember: {
			pill: "bg-[rgba(255,107,61,0.08)] border-[rgba(255,107,61,0.2)] text-ember",
			badge: "bg-ember text-[#1a0a00]",
			text: "text-ember",
		},
	};
	const a = accentClasses[accent];

	return (
		<div
			className={cn(
				"reveal flex flex-col justify-between gap-10 lg:flex-row lg:items-end",
				className,
			)}
		>
			<div className="max-w-[620px]">
				<div
					className={cn(
						"mb-5 inline-flex items-center gap-2.5 rounded-full border py-1 pl-1 pr-3 text-xs",
						a.pill,
					)}
				>
					<span
						className={cn(
							"rounded-sm px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-[0.08em]",
							a.badge,
						)}
					>
						{number}
					</span>
					{label}
				</div>
				<h1
					className="font-display m-0 font-normal leading-[0.95] tracking-[-0.035em]"
					style={{ fontSize: "clamp(40px, 7vw, 84px)" }}
				>
					{title}
				</h1>
				{description && (
					<p className="mt-5 max-w-[560px] text-base leading-[1.6] text-text-secondary sm:text-lg">
						{description}
					</p>
				)}
			</div>
			{aside && <div className="shrink-0">{aside}</div>}
		</div>
	);
}

interface ToolStatProps {
	label: string;
	value: ReactNode;
	unit?: string;
	accent?: "gold" | "green" | "indigo" | "ember" | "muted";
}

export function ToolStat({ label, value, unit, accent = "muted" }: ToolStatProps) {
	const accentClass =
		accent === "gold"
			? "text-gold"
			: accent === "green"
				? "text-green"
				: accent === "indigo"
					? "text-indigo"
					: accent === "ember"
						? "text-ember"
						: "text-text-primary";
	return (
		<div>
			<div className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-text-tertiary">
				{label}
			</div>
			<div className="flex items-baseline gap-1">
				<span
					className={cn("font-display text-[28px] leading-none tracking-[-0.02em]", accentClass)}
				>
					{value}
				</span>
				{unit && (
					<span className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-tertiary">
						{unit}
					</span>
				)}
			</div>
		</div>
	);
}

export function ToolStatBar({ children }: { children: ReactNode }) {
	return (
		<div className="flex gap-6 rounded-xl border border-border-hair bg-bg-card/40 px-7 py-5 backdrop-blur">
			{children}
		</div>
	);
}

export function ToolStatDivider() {
	return <div className="w-px bg-border-hair" />;
}
