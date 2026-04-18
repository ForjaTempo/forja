"use client";

import { ExternalLinkIcon, TrophyIcon } from "lucide-react";
import { useReveal } from "@/components/shared/use-reveal";
import { TIP20_DECIMALS } from "@/lib/constants";
import { formatDate } from "@/lib/format";

interface GraduationBannerProps {
	tokenAddress: string;
	graduatedAt: Date | string | null;
	totalVolume: string;
	uniqueTraders: number;
	createdAt: Date | string;
}

function formatUsdc(raw: string): string {
	const n = Number(BigInt(raw)) / 10 ** TIP20_DECIMALS;
	return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function durationBetween(start: Date | string, end: Date | string): string {
	const s = typeof start === "string" ? new Date(start) : start;
	const e = typeof end === "string" ? new Date(end) : end;
	const ms = e.getTime() - s.getTime();
	if (ms < 0) return "—";
	const hours = Math.floor(ms / (1000 * 60 * 60));
	if (hours < 24) return `${hours}h`;
	const days = Math.floor(hours / 24);
	const remHours = hours % 24;
	return remHours ? `${days}d ${remHours}h` : `${days}d`;
}

export function GraduationBanner({
	tokenAddress,
	graduatedAt,
	totalVolume,
	uniqueTraders,
	createdAt,
}: GraduationBannerProps) {
	useReveal();
	const uniswapUrl = `https://app.uniswap.org/swap?outputCurrency=${tokenAddress}`;
	const ttg = graduatedAt ? durationBetween(createdAt, graduatedAt) : null;

	return (
		<div
			className="reveal relative overflow-hidden rounded-2xl border border-green/25 p-6 sm:p-8"
			style={{
				background:
					"linear-gradient(135deg, rgba(74,222,128,0.08), rgba(74,222,128,0.02) 60%, transparent)",
			}}
		>
			<div
				aria-hidden
				className="-top-24 -right-24 pointer-events-none absolute size-64 blur-3xl"
				style={{ background: "radial-gradient(circle, rgba(74,222,128,0.25), transparent 70%)" }}
			/>
			<div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
				<div className="flex items-start gap-4">
					<div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-green/30 bg-green/10 text-green">
						<TrophyIcon className="size-5" />
					</div>
					<div>
						<div className="font-mono text-[11px] text-green uppercase tracking-[0.2em]">
							Graduated
						</div>
						<h2 className="mt-1 font-display text-[28px] leading-[1.1] tracking-[-0.02em] text-text-primary">
							This launch made it to <span className="text-green italic">Uniswap v4.</span>
						</h2>
						<p className="mt-2 text-[13.5px] text-text-secondary">
							Liquidity migrated permanently.
							{graduatedAt && (
								<span className="text-text-tertiary"> Graduated {formatDate(graduatedAt)}.</span>
							)}
						</p>
					</div>
				</div>

				<a
					href={uniswapUrl}
					target="_blank"
					rel="noopener noreferrer"
					className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-xl border border-green/40 bg-green/10 px-4 py-2.5 font-medium text-[13px] text-green transition-colors hover:border-green/60 hover:bg-green/20"
				>
					Trade on Uniswap
					<ExternalLinkIcon className="size-3.5" />
				</a>
			</div>

			<div className="relative mt-6 grid grid-cols-3 gap-3 border-green/20 border-t pt-5">
				<BannerStat label="Total volume" value={`$${formatUsdc(totalVolume)}`} />
				<BannerStat label="Unique traders" value={uniqueTraders.toLocaleString()} />
				<BannerStat label="Time to graduate" value={ttg ?? "—"} />
			</div>
		</div>
	);
}

function BannerStat({ label, value }: { label: string; value: string }) {
	return (
		<div>
			<div className="font-mono text-[10px] text-text-tertiary uppercase tracking-[0.14em]">
				{label}
			</div>
			<div className="mt-1 font-display text-[24px] text-green tracking-[-0.02em]">{value}</div>
		</div>
	);
}
