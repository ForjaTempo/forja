"use client";

import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { useMemo } from "react";
import { getTokenDailyStats } from "@/actions/token-hub";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const Area = dynamic(() => import("recharts").then((m) => m.Area), { ssr: false });
const AreaChart = dynamic(() => import("recharts").then((m) => m.AreaChart), { ssr: false });
const ResponsiveContainer = dynamic(() => import("recharts").then((m) => m.ResponsiveContainer), {
	ssr: false,
});
const Tooltip = dynamic(() => import("recharts").then((m) => m.Tooltip), { ssr: false });
const XAxis = dynamic(() => import("recharts").then((m) => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then((m) => m.YAxis), { ssr: false });

interface TransferVolumeChartProps {
	tokenAddress: string;
	days?: number;
}

function formatDateShort(d: Date | string): string {
	const date = typeof d === "string" ? new Date(d) : d;
	return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function TransferVolumeChart({ tokenAddress, days = 30 }: TransferVolumeChartProps) {
	const { data, isLoading } = useQuery({
		queryKey: ["token-daily-stats", tokenAddress, days],
		queryFn: () => getTokenDailyStats(tokenAddress, days),
		staleTime: 5 * 60_000,
	});

	const chartData = useMemo(() => {
		if (!data) return [];
		return data.map((row) => ({
			date: formatDateShort(row.date),
			transfers: row.transferCount,
		}));
	}, [data]);

	const hasEnoughData = chartData.length >= 2;

	return (
		<Card className="border-anvil-gray-light bg-deep-charcoal">
			<CardHeader className="pb-2">
				<CardTitle className="text-sm text-steel-white">Transfer Activity ({days}d)</CardTitle>
			</CardHeader>
			<CardContent>
				{isLoading ? (
					<Skeleton className="h-[200px] rounded" />
				) : !hasEnoughData ? (
					<div className="flex h-[200px] items-center justify-center">
						<p className="text-center text-sm text-smoke-dark">
							Not enough transfer data yet. Chart will populate as the token gets more activity.
						</p>
					</div>
				) : (
					<div className="h-[200px]">
						<ResponsiveContainer width="100%" height="100%">
							<AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
								<defs>
									<linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
										<stop offset="0%" stopColor="#5b6ada" stopOpacity={0.4} />
										<stop offset="100%" stopColor="#5b6ada" stopOpacity={0.05} />
									</linearGradient>
								</defs>
								<XAxis
									dataKey="date"
									tick={{ fill: "#6B7280", fontSize: 10 }}
									tickLine={false}
									axisLine={{ stroke: "#374151" }}
									interval="preserveStartEnd"
									minTickGap={30}
								/>
								<YAxis
									tick={{ fill: "#6B7280", fontSize: 10 }}
									tickLine={false}
									axisLine={false}
									width={40}
									allowDecimals={false}
								/>
								<Tooltip
									content={({ payload, label }) => {
										if (!payload?.[0]) return null;
										const value = payload[0].value as number;
										return (
											<div className="rounded border border-anvil-gray-light bg-obsidian-black p-2 text-xs">
												<p className="text-smoke-dark">{label}</p>
												<p className="text-indigo">{value} transfers</p>
											</div>
										);
									}}
								/>
								<Area
									type="monotone"
									dataKey="transfers"
									stroke="#5b6ada"
									strokeWidth={2}
									fill="url(#volumeGradient)"
									dot={false}
									animationDuration={500}
								/>
							</AreaChart>
						</ResponsiveContainer>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
