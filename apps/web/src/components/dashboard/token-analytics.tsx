"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeftIcon } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";
import { getTokenAnalytics } from "@/actions/dashboard";
import { CHART_TOOLTIP_STYLE, ChartWrapper } from "@/components/dashboard/chart-wrapper";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { formatDate } from "@/lib/format";

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

const formatter = new Intl.NumberFormat("en-US");

type TimeRange = "7d" | "30d" | "90d";

interface TokenAnalyticsProps {
	tokenAddress: string;
	tokenName: string;
	tokenSymbol: string;
	onBack: () => void;
}

export function TokenAnalytics({
	tokenAddress,
	tokenName,
	tokenSymbol,
	onBack,
}: TokenAnalyticsProps) {
	const [range, setRange] = useState<TimeRange>("7d");

	const { data: stats = [], isLoading } = useQuery({
		queryKey: ["token-analytics", tokenAddress, range],
		queryFn: () => getTokenAnalytics(tokenAddress, range),
		staleTime: 60_000,
	});

	const chartData = stats.map((s) => ({
		date: formatDate(new Date(s.date)),
		holders: s.holderCount,
		transfers: s.transferCount,
		volume: Number(BigInt(s.transferVolume) / 10n ** 6n),
		senders: s.uniqueSenders,
		receivers: s.uniqueReceivers,
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
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-3">
					<button
						type="button"
						onClick={onBack}
						className="rounded-md p-1.5 text-smoke transition-colors hover:bg-anvil-gray-light hover:text-steel-white"
					>
						<ArrowLeftIcon className="size-4" />
					</button>
					<div>
						<h2 className="text-lg font-semibold text-steel-white">{tokenName}</h2>
						<p className="text-xs text-smoke-dark">{tokenSymbol}</p>
					</div>
				</div>
				<Select value={range} onValueChange={(v) => setRange(v as TimeRange)}>
					<SelectTrigger className="w-24 border-anvil-gray-light bg-anvil-gray text-smoke">
						<SelectValue />
					</SelectTrigger>
					<SelectContent className="border-anvil-gray-light bg-anvil-gray">
						<SelectItem value="7d">7 days</SelectItem>
						<SelectItem value="30d">30 days</SelectItem>
						<SelectItem value="90d">90 days</SelectItem>
					</SelectContent>
				</Select>
			</div>

			<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
				<StatCard label="Current Holders" value={formatter.format(currentHolders)} />
				<StatCard
					label={`${range} Change`}
					value={`${Number(holderChange) >= 0 ? "+" : ""}${holderChange}%`}
				/>
				<StatCard label="Total Transfers" value={formatter.format(totalTransfers)} />
				<StatCard label="Total Volume" value={formatter.format(Number(totalVolume / 10n ** 6n))} />
			</div>

			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
				<ChartWrapper title="Holder Growth" loading={isLoading}>
					<ResponsiveContainer width="100%" height={256}>
						<AreaChart data={chartData}>
							<defs>
								<linearGradient id="holderGradient" x1="0" y1="0" x2="0" y2="1">
									<stop offset="5%" stopColor="#E8A317" stopOpacity={0.3} />
									<stop offset="95%" stopColor="#E8A317" stopOpacity={0} />
								</linearGradient>
							</defs>
							<CartesianGrid strokeDasharray="3 3" stroke="#333" />
							<XAxis dataKey="date" tick={{ fill: "#6B7280", fontSize: 11 }} />
							<YAxis tick={{ fill: "#6B7280", fontSize: 11 }} />
							<Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
							<Area
								type="monotone"
								dataKey="holders"
								stroke="#E8A317"
								fill="url(#holderGradient)"
							/>
						</AreaChart>
					</ResponsiveContainer>
				</ChartWrapper>

				<ChartWrapper title="Transfer Volume" loading={isLoading}>
					<ResponsiveContainer width="100%" height={256}>
						<BarChart data={chartData}>
							<CartesianGrid strokeDasharray="3 3" stroke="#333" />
							<XAxis dataKey="date" tick={{ fill: "#6B7280", fontSize: 11 }} />
							<YAxis tick={{ fill: "#6B7280", fontSize: 11 }} />
							<Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
							<Bar dataKey="volume" fill="#D1D5DB" radius={[4, 4, 0, 0]} />
						</BarChart>
					</ResponsiveContainer>
				</ChartWrapper>

				<ChartWrapper title="Daily Activity" loading={isLoading}>
					<ResponsiveContainer width="100%" height={256}>
						<LineChart data={chartData}>
							<CartesianGrid strokeDasharray="3 3" stroke="#333" />
							<XAxis dataKey="date" tick={{ fill: "#6B7280", fontSize: 11 }} />
							<YAxis tick={{ fill: "#6B7280", fontSize: 11 }} />
							<Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
							<Line type="monotone" dataKey="senders" stroke="#6B7280" name="Senders" dot={false} />
							<Line
								type="monotone"
								dataKey="receivers"
								stroke="#E8A317"
								name="Receivers"
								dot={false}
							/>
						</LineChart>
					</ResponsiveContainer>
				</ChartWrapper>
			</div>
		</div>
	);
}

function StatCard({ label, value }: { label: string; value: string }) {
	return (
		<div className="rounded-lg border border-anvil-gray-light bg-obsidian-black/50 p-3">
			<p className="text-xs text-smoke-dark">{label}</p>
			<p className="mt-1 font-mono text-sm font-semibold text-steel-white">{value}</p>
		</div>
	);
}
