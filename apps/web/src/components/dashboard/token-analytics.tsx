"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeftIcon } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";
import { getTokenAnalytics } from "@/actions/dashboard";
import { getTokenHolderDistribution } from "@/actions/token-hub";
import { CHART_TOOLTIP_STYLE, ChartWrapper } from "@/components/dashboard/chart-wrapper";
import { AddressDisplay } from "@/components/ui/address-display";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { StatCard } from "@/components/ui/stat-card";
import { formatDate, formatSupply } from "@/lib/format";

const AreaChart = dynamic(() => import("recharts").then((m) => m.AreaChart), { ssr: false });
const BarChart = dynamic(() => import("recharts").then((m) => m.BarChart), { ssr: false });
const LineChart = dynamic(() => import("recharts").then((m) => m.LineChart), { ssr: false });
const Area = dynamic(() => import("recharts").then((m) => m.Area), { ssr: false });
const Bar = dynamic(() => import("recharts").then((m) => m.Bar), { ssr: false });
const Line = dynamic(() => import("recharts").then((m) => m.Line), { ssr: false });
const XAxis = dynamic(() => import("recharts").then((m) => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then((m) => m.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import("recharts").then((m) => m.CartesianGrid), {
	ssr: false,
});
const Tooltip = dynamic(() => import("recharts").then((m) => m.Tooltip), { ssr: false });
const ResponsiveContainer = dynamic(() => import("recharts").then((m) => m.ResponsiveContainer), {
	ssr: false,
});

const numFormatter = new Intl.NumberFormat("en-US");

type TimeRange = "7d" | "30d" | "90d" | "all";

interface TokenAnalyticsProps {
	tokenAddress: string;
	tokenName: string;
	tokenSymbol: string;
	tokenDecimals: number;
	onBack: () => void;
}

export function TokenAnalytics({
	tokenAddress,
	tokenName,
	tokenSymbol,
	tokenDecimals,
	onBack,
}: TokenAnalyticsProps) {
	const [range, setRange] = useState<TimeRange>("7d");

	const { data: stats = [], isLoading } = useQuery({
		queryKey: ["token-analytics", tokenAddress, range],
		queryFn: () => getTokenAnalytics(tokenAddress, range),
		staleTime: 60_000,
	});

	const { data: holders = [] } = useQuery({
		queryKey: ["token-top-holders", tokenAddress],
		queryFn: () => getTokenHolderDistribution(tokenAddress),
		staleTime: 60_000,
	});

	const divisor = 10 ** tokenDecimals;
	const chartData = stats.map((s) => ({
		date: formatDate(new Date(s.date)),
		holders: s.holderCount,
		transfers: s.transferCount,
		volume: Number(BigInt(s.transferVolume)) / divisor,
	}));

	const lastStat = stats.length > 0 ? stats[stats.length - 1] : undefined;
	const firstStat = stats.length > 0 ? stats[0] : undefined;
	const currentHolders = lastStat?.holderCount ?? 0;
	const firstHolders = firstStat?.holderCount ?? 0;
	const holderChange =
		firstHolders > 0 ? (((currentHolders - firstHolders) / firstHolders) * 100).toFixed(1) : "0";
	const totalTransfers = stats.reduce((sum, s) => sum + s.transferCount, 0);
	const totalVolume = stats.reduce((sum, s) => sum + BigInt(s.transferVolume), 0n);

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between gap-3">
				<div className="flex items-center gap-3">
					<button
						type="button"
						onClick={onBack}
						aria-label="Back to dashboard"
						className="inline-flex size-9 items-center justify-center rounded-lg border border-border-hair bg-bg-field text-text-secondary transition-colors hover:border-border-subtle hover:text-text-primary"
					>
						<ArrowLeftIcon className="size-4" />
					</button>
					<div>
						<h2 className="font-display text-[22px] tracking-[-0.01em] text-text-primary">
							{tokenName}
						</h2>
						<p className="font-mono text-[11px] text-gold uppercase tracking-[0.12em]">
							{tokenSymbol}
						</p>
					</div>
				</div>
				<Select value={range} onValueChange={(v) => setRange(v as TimeRange)}>
					<SelectTrigger className="w-28 border-border-hair bg-bg-field text-text-secondary">
						<SelectValue />
					</SelectTrigger>
					<SelectContent className="border-border-subtle bg-bg-elevated">
						<SelectItem value="7d">7 days</SelectItem>
						<SelectItem value="30d">30 days</SelectItem>
						<SelectItem value="90d">90 days</SelectItem>
						<SelectItem value="all">All</SelectItem>
					</SelectContent>
				</Select>
			</div>

			<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
				<StatCard label="Current holders" value={numFormatter.format(currentHolders)} />
				<StatCard
					label={`${range === "all" ? "Total" : range} change`}
					value={`${Number(holderChange) >= 0 ? "+" : ""}${holderChange}%`}
				/>
				<StatCard label="Total transfers" value={numFormatter.format(totalTransfers)} />
				<StatCard label="Total volume" value={numFormatter.format(Number(totalVolume) / divisor)} />
			</div>

			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
				<ChartWrapper title="Holder growth" loading={isLoading}>
					<ResponsiveContainer width="100%" height={256}>
						<AreaChart data={chartData}>
							<defs>
								<linearGradient id="holderGradient" x1="0" y1="0" x2="0" y2="1">
									<stop offset="5%" stopColor="#818cf8" stopOpacity={0.35} />
									<stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
								</linearGradient>
							</defs>
							<CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
							<XAxis dataKey="date" tick={{ fill: "#7a7e93", fontSize: 11 }} />
							<YAxis tick={{ fill: "#7a7e93", fontSize: 11 }} />
							<Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
							<Area
								type="monotone"
								dataKey="holders"
								stroke="#818cf8"
								fill="url(#holderGradient)"
								animationDuration={1200}
								animationEasing="ease-out"
							/>
						</AreaChart>
					</ResponsiveContainer>
				</ChartWrapper>

				<ChartWrapper title="Transfer volume" loading={isLoading}>
					<ResponsiveContainer width="100%" height={256}>
						<BarChart data={chartData}>
							<CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
							<XAxis dataKey="date" tick={{ fill: "#7a7e93", fontSize: 11 }} />
							<YAxis tick={{ fill: "#7a7e93", fontSize: 11 }} />
							<Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
							<Bar
								dataKey="volume"
								fill="#818cf8"
								radius={[4, 4, 0, 0]}
								animationDuration={1000}
								animationBegin={50}
							/>
						</BarChart>
					</ResponsiveContainer>
				</ChartWrapper>

				<ChartWrapper title="Daily transfers" loading={isLoading}>
					<ResponsiveContainer width="100%" height={256}>
						<LineChart data={chartData}>
							<CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
							<XAxis dataKey="date" tick={{ fill: "#7a7e93", fontSize: 11 }} />
							<YAxis tick={{ fill: "#7a7e93", fontSize: 11 }} />
							<Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
							<Line
								type="monotone"
								dataKey="transfers"
								stroke="#818cf8"
								name="Transfers"
								dot={false}
								animationDuration={800}
							/>
						</LineChart>
					</ResponsiveContainer>
				</ChartWrapper>
			</div>

			{holders.length > 0 && (
				<div className="rounded-2xl border border-border-hair bg-bg-elevated">
					<div className="px-5 py-4 font-mono text-[10px] text-text-tertiary uppercase tracking-[0.14em]">
						Top holders
					</div>
					<div className="overflow-x-auto border-border-hair border-t">
						<table className="w-full text-[13px]">
							<thead>
								<tr className="font-mono text-[10px] text-text-tertiary uppercase tracking-[0.12em]">
									<th className="py-2.5 pr-4 pl-5 text-left font-medium">#</th>
									<th className="py-2.5 pr-4 text-left font-medium">Address</th>
									<th className="py-2.5 pr-4 text-right font-medium">Balance</th>
									<th className="py-2.5 pr-5 text-right font-medium">Share</th>
								</tr>
							</thead>
							<tbody>
								{holders.map((h, i) => (
									<tr key={h.holderAddress} className="border-border-hair border-t">
										<td className="py-2 pr-4 pl-5 font-mono text-[11px] text-text-tertiary">
											{i + 1}
										</td>
										<td className="py-2 pr-4">
											<AddressDisplay address={h.holderAddress} />
										</td>
										<td className="py-2 pr-4 text-right font-mono text-[12px] text-text-primary">
											{formatSupply(BigInt(h.balance))}
										</td>
										<td className="py-2 pr-5 text-right font-mono text-[12px] text-text-secondary">
											{h.percentage.toFixed(2)}%
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			)}
		</div>
	);
}
