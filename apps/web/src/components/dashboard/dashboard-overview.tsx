"use client";

import type { DashboardOverviewData } from "@/actions/dashboard";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { Badge } from "@/components/ui/badge";
import { formatSupply } from "@/lib/format";

function parseTvl(raw: string): number {
	try {
		return Number(BigInt(raw)) / 1_000_000;
	} catch {
		return 0;
	}
}

interface DashboardOverviewProps {
	overview: DashboardOverviewData;
	/** Reserved for future use (e.g. address-specific drill-downs). */
	address?: string;
}

/**
 * Portfolio hero — 1fr 2fr split with TVL display on the left and a decorative
 * sparkline + stat mini-cards on the right. Real values only, never mocked.
 */
export function DashboardOverview({ overview }: DashboardOverviewProps) {
	const tvlBig = BigInt(overview.totalValueLocked || "0");
	const tvlCompact = tvlBig > 0n ? formatSupply(tvlBig) : "—";
	const tvlNumeric = parseTvl(overview.totalValueLocked);

	const stats: Array<{
		label: string;
		value: string | number;
		tone: "gold" | "indigo" | "green" | "ember";
		display?: string;
	}> = [
		{ label: "Tokens created", value: overview.tokensCreated, tone: "gold" },
		{ label: "Holders reached", value: overview.totalRecipients, tone: "indigo" },
		{ label: "Value locked", value: tvlNumeric, display: tvlCompact, tone: "green" },
		{ label: "Active launches", value: overview.launchCount, tone: "ember" },
	];

	const feesPaid = overview.totalFeesPaid;
	const feesDisplay =
		feesPaid > 0 ? `$${feesPaid.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : "—";

	return (
		<div
			className="reveal rounded-3xl border border-border-subtle p-8 sm:p-10"
			style={{
				background: "linear-gradient(135deg, var(--color-bg-elevated), var(--color-bg-card))",
			}}
		>
			<div className="grid gap-10 lg:grid-cols-[1fr_2fr]">
				{/* Left: TVL + mini stats */}
				<div>
					<p className="font-mono text-[11px] uppercase tracking-[0.14em] text-text-tertiary">
						Total value locked
					</p>
					<div className="mt-2 font-display text-5xl leading-none tracking-tight sm:text-6xl">
						<span className="gold-text">{tvlBig > 0n ? tvlCompact : "—"}</span>
					</div>
					<div className="mt-3 font-mono text-sm text-text-secondary">
						{overview.tokensCreated > 0
							? `${overview.tokensCreated} token${overview.tokensCreated === 1 ? "" : "s"} forged · ${feesDisplay} paid in fees`
							: "No activity yet"}
					</div>

					<div className="mt-8 grid grid-cols-2 gap-3">
						{stats.map((s) => (
							<MiniStat
								key={s.label}
								label={s.label}
								value={s.value}
								display={s.display}
								tone={s.tone}
							/>
						))}
					</div>
				</div>

				{/* Right: decorative sparkline + header */}
				<div>
					<div className="mb-3 flex items-center justify-between">
						<div className="text-sm font-medium text-text-primary">Portfolio snapshot</div>
						{overview.unreadAlerts > 0 ? (
							<div className="inline-flex items-center gap-2 font-mono text-[11px] text-ember">
								<span
									className="block size-1.5 rounded-full bg-ember"
									style={{ animation: "ember-flicker 1.5s infinite" }}
								/>
								{overview.unreadAlerts} unread
							</div>
						) : (
							<div className="inline-flex items-center gap-2 font-mono text-[11px] text-text-tertiary">
								<span className="block size-1.5 rounded-full bg-green shadow-[0_0_8px_var(--color-green)]" />
								Live
							</div>
						)}
					</div>
					<SparklinePlaceholder />
					<div className="mt-3 grid grid-cols-3 gap-3 font-mono text-[11px] text-text-tertiary">
						<SummaryCell label="Multisends" value={overview.multisendCount} />
						<SummaryCell label="Locks" value={overview.lockCount} />
						<SummaryCell label="Watchlist" value={overview.watchlistCount} />
					</div>
				</div>
			</div>
		</div>
	);
}

function MiniStat({
	label,
	value,
	display,
	tone,
}: {
	label: string;
	value: string | number;
	display?: string;
	tone: "gold" | "indigo" | "green" | "ember";
}) {
	const toneClass = {
		gold: "text-gold",
		indigo: "text-indigo",
		green: "text-green",
		ember: "text-ember",
	}[tone];

	return (
		<div className="rounded-[10px] border border-border-hair bg-bg-field p-[14px]">
			<p className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-tertiary">
				{label}
			</p>
			<div className={`mt-1 font-display text-[22px] tracking-tight ${toneClass}`}>
				{display !== undefined ? (
					display
				) : typeof value === "number" ? (
					<AnimatedCounter value={value} />
				) : (
					value
				)}
			</div>
		</div>
	);
}

function SummaryCell({ label, value }: { label: string; value: number }) {
	return (
		<div className="rounded-[10px] border border-border-hair bg-bg-field p-3">
			<p className="text-[10px] uppercase tracking-[0.12em] text-text-tertiary">{label}</p>
			<p className="mt-1 text-[15px] text-text-primary">{value}</p>
		</div>
	);
}

/**
 * Decorative sparkline — purely visual, not data-driven. We intentionally do
 * not display a chart of fabricated portfolio history; the gradient line hints
 * at activity without claiming a specific value.
 */
function SparklinePlaceholder() {
	const pts = [28, 32, 30, 38, 42, 48, 45, 52, 58, 55, 62, 68, 72, 70, 78, 84, 82, 88, 92, 96];
	const max = Math.max(...pts);
	const min = Math.min(...pts);
	const coords = pts
		.map(
			(v, i) => `${(i / (pts.length - 1)) * 100},${100 - ((v - min) / (max - min || 1)) * 92 - 4}`,
		)
		.join(" ");
	return (
		<svg
			viewBox="0 0 100 100"
			preserveAspectRatio="none"
			className="block h-[180px] w-full sm:h-[220px]"
			aria-hidden
		>
			<title>Decorative portfolio sparkline</title>
			<defs>
				<linearGradient id="dash-spark-fill" x1="0" x2="0" y1="0" y2="1">
					<stop offset="0" stopColor="#f0d38a" stopOpacity="0.3" />
					<stop offset="1" stopColor="#f0d38a" stopOpacity="0" />
				</linearGradient>
			</defs>
			{[20, 40, 60, 80].map((y) => (
				<line
					key={y}
					x1="0"
					x2="100"
					y1={y}
					y2={y}
					stroke="rgba(255,255,255,0.04)"
					vectorEffect="non-scaling-stroke"
				/>
			))}
			<polygon points={`0,100 ${coords} 100,100`} fill="url(#dash-spark-fill)" />
			<polyline
				points={coords}
				fill="none"
				stroke="#f0d38a"
				strokeWidth="1.8"
				strokeLinecap="round"
				vectorEffect="non-scaling-stroke"
			/>
		</svg>
	);
}

export { Badge };
