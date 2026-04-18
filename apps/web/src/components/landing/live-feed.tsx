import type { LiveEvent } from "@/actions/live-feed";
import { getLandingLiveFeed } from "@/actions/live-feed";

const EVENT_COLORS: Record<LiveEvent["kind"], string> = {
	create: "var(--color-gold)",
	lock: "var(--color-indigo)",
	launch: "#f472b6",
	claim: "var(--color-ember)",
	multisend: "var(--color-green)",
	swap: "#60a5fa",
};

function formatAgo(s: number): string {
	if (s < 60) return `${s}s`;
	if (s < 3600) return `${Math.floor(s / 60)}m`;
	if (s < 86_400) return `${Math.floor(s / 3600)}h`;
	return `${Math.floor(s / 86_400)}d`;
}

export async function LiveFeed() {
	const { events, block } = await getLandingLiveFeed();
	if (events.length === 0) return null;

	const stats: Array<[string, string]> = [
		["340ms", "Avg finality"],
		["$0.0008", "Avg gas per tx"],
		["99.99%", "Uptime (30d)"],
		["TIP-20", "Native standard"],
	];

	return (
		<section className="px-6 py-20 lg:px-10">
			<div className="mx-auto grid max-w-[1400px] gap-10 lg:grid-cols-2 lg:gap-20 lg:items-center">
				<div className="reveal">
					<div className="mb-5 inline-flex items-center gap-2 font-mono text-[11px] text-ember uppercase tracking-[0.2em]">
						<span
							aria-hidden
							className="size-2 animate-[ember-flicker_1.5s_ease-in-out_infinite] rounded-full bg-ember shadow-[0_0_8px_var(--color-ember)]"
						/>
						Live · on-chain
					</div>
					<h2 className="m-0 mb-6 font-display font-normal text-[clamp(36px,5vw,64px)] leading-[1.05] tracking-[-0.03em]">
						Every action,
						<br />
						<span className="ember-text italic">verifiable in real time.</span>
					</h2>
					<p className="mb-10 max-w-[460px] text-[17px] text-text-secondary leading-[1.6]">
						Forja is built on Tempo's dedicated payment lanes — sub-second finality, predictable
						fees, zero noisy-neighbor risk.
					</p>
					<div className="grid max-w-[480px] grid-cols-2 gap-4">
						{stats.map(([value, label]) => (
							<div
								key={label}
								className="rounded-xl border border-border-hair bg-bg-elevated px-4 py-3.5"
							>
								<div className="font-display text-[26px] text-gold tracking-[-0.02em]">{value}</div>
								<div className="mt-0.5 text-[12px] text-text-tertiary">{label}</div>
							</div>
						))}
					</div>
				</div>

				<div className="reveal" style={{ transitionDelay: "0.2s" }}>
					<div
						className="relative overflow-hidden rounded-[20px] border border-border-subtle p-6 shadow-[0_30px_80px_rgba(0,0,0,0.5)]"
						style={{
							background: "linear-gradient(180deg, var(--color-bg-elevated), var(--color-bg-card))",
						}}
					>
						<div
							aria-hidden
							className="absolute inset-x-0 top-0 h-0.5 animate-[gold-sweep_3s_ease-in-out_infinite]"
							style={{
								background: "linear-gradient(90deg, transparent, var(--color-gold), transparent)",
								backgroundSize: "200% 100%",
							}}
						/>
						<div className="mb-4 flex items-center justify-between border-border-hair border-b pb-4">
							<div className="flex items-center gap-2.5">
								<span
									aria-hidden
									className="size-2 animate-[ember-flicker_2s_infinite] rounded-full bg-green shadow-[0_0_10px_var(--color-green)]"
								/>
								<span className="font-medium text-[13px]">Forja Indexer</span>
							</div>
							{block !== null && (
								<div className="font-mono text-[11px] text-text-tertiary">
									block #{block.toLocaleString()}
								</div>
							)}
						</div>
						<ul className="divide-y divide-border-hair">
							{events.map((e, i) => (
								<li
									key={`${e.kind}-${e.txHash}-${e.secondsAgo}`}
									className="flex items-center gap-3.5 py-3"
									style={{ opacity: 1 - i * 0.08 }}
								>
									<span
										className="min-w-[74px] rounded px-2 py-0.5 text-center font-mono text-[10px] uppercase tracking-[0.08em]"
										style={{
											background: `${EVENT_COLORS[e.kind]}15`,
											color: EVENT_COLORS[e.kind],
										}}
									>
										{e.kind}
									</span>
									<span className="flex-1 truncate text-[13.5px]">{e.text}</span>
									<span className="font-mono text-[11px] text-text-tertiary">
										{formatAgo(e.secondsAgo)} ago
									</span>
								</li>
							))}
						</ul>
					</div>
				</div>
			</div>
		</section>
	);
}
