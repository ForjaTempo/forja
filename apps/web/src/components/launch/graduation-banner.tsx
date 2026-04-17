"use client";

import { ExternalLinkIcon, TrophyIcon } from "lucide-react";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
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
	const uniswapUrl = `https://app.uniswap.org/swap?outputCurrency=${tokenAddress}`;
	const ttg = graduatedAt ? durationBetween(createdAt, graduatedAt) : null;

	return (
		<ScrollReveal>
			<div className="overflow-hidden rounded-xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent p-5 sm:p-6">
				<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
					<div className="flex items-start gap-3">
						<div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
							<TrophyIcon className="size-5" />
						</div>
						<div>
							<h2 className="text-lg font-semibold text-emerald-400">This token graduated!</h2>
							<p className="mt-1 text-sm text-smoke">
								Liquidity migrated to Uniswap v4 with permanent LP.
								{graduatedAt && (
									<span className="text-smoke-dark"> Graduated {formatDate(graduatedAt)}.</span>
								)}
							</p>
						</div>
					</div>

					<a
						href={uniswapUrl}
						target="_blank"
						rel="noopener noreferrer"
						className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-400 transition-colors hover:border-emerald-500/60 hover:bg-emerald-500/20"
					>
						Trade on Uniswap
						<ExternalLinkIcon className="size-3.5" />
					</a>
				</div>

				<div className="mt-4 grid grid-cols-3 gap-3 border-t border-emerald-500/20 pt-4 text-center">
					<BannerStat label="Total Volume" value={`$${formatUsdc(totalVolume)}`} />
					<BannerStat label="Unique Traders" value={uniqueTraders.toString()} />
					<BannerStat label="Time to Graduate" value={ttg ?? "—"} />
				</div>
			</div>
		</ScrollReveal>
	);
}

function BannerStat({ label, value }: { label: string; value: string }) {
	return (
		<div>
			<p className="text-lg font-semibold text-emerald-400">{value}</p>
			<p className="mt-0.5 text-xs text-smoke-dark">{label}</p>
		</div>
	);
}
