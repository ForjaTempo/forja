"use client";

import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { useMemo } from "react";
import { getTokenDailyStats } from "@/actions/token-hub";
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
		<div className="rounded-2xl border border-border-hair bg-bg-elevated p-5">
			<div className="mb-4 font-mono text-[10px] text-text-tertiary uppercase tracking-[0.14em]">
				Transfer activity · {days}d
			</div>
			{isLoading ? (
				<Skeleton className="h-[200px] rounded-xl" />
			) : !hasEnoughData ? (
				<div className="flex h-[200px] items-center justify-center">
					<p className="max-w-sm text-center text-[13px] text-text-tertiary">
						Not enough transfer data yet. Chart fills in as the token accrues activity.
					</p>
				</div>
			) : (
				<div className="h-[200px]">
					<ResponsiveContainer width="100%" height="100%">
						<AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
							<defs>
								<linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
									<stop offset="0%" stopColor="#818cf8" stopOpacity={0.4} />
									<stop offset="100%" stopColor="#818cf8" stopOpacity={0.05} />
								</linearGradient>
							</defs>
							<XAxis
								dataKey="date"
								tick={{ fill: "#7a7e93", fontSize: 10 }}
								tickLine={false}
								axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
								interval="preserveStartEnd"
								minTickGap={30}
							/>
							<YAxis
								tick={{ fill: "#7a7e93", fontSize: 10 }}
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
										<div className="rounded-xl border border-border-subtle bg-bg-elevated px-3 py-2 font-mono text-[11px] shadow-lg">
											<p className="text-text-tertiary">{label}</p>
											<p className="mt-0.5 text-indigo">{value} transfers</p>
										</div>
									);
								}}
							/>
							<Area
								type="monotone"
								dataKey="transfers"
								stroke="#818cf8"
								strokeWidth={2}
								fill="url(#volumeGradient)"
								dot={false}
								animationDuration={500}
							/>
						</AreaChart>
					</ResponsiveContainer>
				</div>
			)}
		</div>
	);
}
