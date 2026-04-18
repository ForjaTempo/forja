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
 * Portfolio hero — 1fr 2fr split with TVL display on the left and real-activity
 * bar chart on the right. All numbers are pulled from overview; no mocked data.
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

	const activity = [
		{ key: "Tokens", value: overview.tokensCreated, color: "#f0d38a" },
		{ key: "Sends", value: overview.multisendCount, color: "#4ade80" },
		{ key: "Locks", value: overview.lockCount, color: "#818cf8" },
		{ key: "Launches", value: overview.launchCount, color: "#f472b6" },
		{ key: "Watchlist", value: overview.watchlistCount, color: "#60a5fa" },
	];
	const hasActivity = activity.some((a) => a.value > 0);

	return (
		<div
			className="reveal rounded-3xl border border-border-subtle p-8 sm:p-10"
			style={{
				background: "linear-gradient(135deg, var(--color-bg-elevated), var(--color-bg-card))",
			}}
		>
			<div className="grid gap-10 lg:grid-cols-[1fr_2fr]">
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

				<div>
					<div className="mb-3 flex items-center justify-between">
						<div className="font-mono text-[10px] text-text-tertiary uppercase tracking-[0.14em]">
							Activity mix
						</div>
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

					{hasActivity ? <ActivityBars items={activity} /> : <ActivityEmpty />}

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

function ActivityBars({ items }: { items: Array<{ key: string; value: number; color: string }> }) {
	const max = Math.max(...items.map((i) => i.value), 1);
	return (
		<div className="rounded-2xl border border-border-hair bg-bg-field/40 p-5">
			<div className="grid grid-cols-5 items-end gap-3 h-[180px] sm:h-[200px]">
				{items.map((item) => {
					const pct = (item.value / max) * 100;
					return (
						<div key={item.key} className="flex h-full flex-col justify-end">
							<div
								className="relative w-full rounded-t-md transition-[height] duration-700"
								style={{
									height: `${Math.max(pct, item.value > 0 ? 8 : 0)}%`,
									minHeight: item.value > 0 ? "12px" : "0",
									background: `linear-gradient(180deg, ${item.color}, ${item.color}55)`,
									boxShadow: `0 -6px 20px -10px ${item.color}`,
								}}
							/>
						</div>
					);
				})}
			</div>
			<div className="mt-3 grid grid-cols-5 gap-3 font-mono text-[10px] text-text-tertiary uppercase tracking-[0.1em]">
				{items.map((item) => (
					<div key={item.key} className="flex flex-col items-center gap-0.5">
						<span style={{ color: item.color }}>{item.value}</span>
						<span className="truncate text-[9px]">{item.key}</span>
					</div>
				))}
			</div>
		</div>
	);
}

function ActivityEmpty() {
	return (
		<div className="flex h-[220px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border-hair bg-bg-field/30 px-6 text-center">
			<p className="font-display text-[18px] tracking-[-0.01em] text-text-primary">
				Your forge is <span className="gold-text italic">cold.</span>
			</p>
			<p className="text-[12.5px] text-text-tertiary">
				Create your first token, run a multisend, or lock some supply — activity shows up here.
			</p>
		</div>
	);
}

export { Badge };
