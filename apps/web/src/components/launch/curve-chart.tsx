"use client";

import { useMemo } from "react";
import {
	Area,
	AreaChart,
	ReferenceLine,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Contract constants (6 decimals)
const VIRTUAL_TOKEN_RESERVE = 1_073_000_000;
const VIRTUAL_USDC_RESERVE = 30_000;
const CURVE_SUPPLY = 800_000_000;
const GRADUATION_THRESHOLD = 69_000;
const K = VIRTUAL_TOKEN_RESERVE * VIRTUAL_USDC_RESERVE;

const NUM_POINTS = 80;

interface CurveDataPoint {
	percentSold: number;
	price: number;
	usdcRaised: number;
}

function generateCurveData(): CurveDataPoint[] {
	const points: CurveDataPoint[] = [];
	for (let i = 0; i <= NUM_POINTS; i++) {
		const frac = i / NUM_POINTS;
		const tokensSold = CURVE_SUPPLY * frac;
		const virtualTokens = VIRTUAL_TOKEN_RESERVE - tokensSold;
		const virtualUsdc = K / virtualTokens;
		const price = virtualUsdc / virtualTokens;
		const usdcRaised = virtualUsdc - VIRTUAL_USDC_RESERVE;
		points.push({
			percentSold: Math.round(frac * 100),
			price,
			usdcRaised: Math.max(0, usdcRaised),
		});
	}
	return points;
}

interface CurveChartProps {
	realTokensSold: string;
	realUsdcRaised: string;
	graduated: boolean;
}

export function CurveChart({ realTokensSold, realUsdcRaised, graduated }: CurveChartProps) {
	const data = useMemo(() => generateCurveData(), []);

	const currentPctSold = useMemo(() => {
		const sold = Number(BigInt(realTokensSold)) / 1e6;
		return Math.min(100, (sold / CURVE_SUPPLY) * 100);
	}, [realTokensSold]);

	const currentPrice = useMemo(() => {
		const sold = Number(BigInt(realTokensSold)) / 1e6;
		const virtualTokens = VIRTUAL_TOKEN_RESERVE - sold;
		const virtualUsdc = K / virtualTokens;
		return virtualUsdc / virtualTokens;
	}, [realTokensSold]);

	const graduationPctSold = useMemo(() => {
		for (const point of data) {
			if (point.usdcRaised >= GRADUATION_THRESHOLD) {
				return point.percentSold;
			}
		}
		return 100;
	}, [data]);

	const progressPct = useMemo(() => {
		const raised = Number(BigInt(realUsdcRaised)) / 1e6;
		return Math.min(100, (raised / GRADUATION_THRESHOLD) * 100);
	}, [realUsdcRaised]);

	return (
		<Card className="border-anvil-gray-light bg-deep-charcoal">
			<CardHeader className="pb-2">
				<div className="flex items-center justify-between">
					<CardTitle className="text-sm text-steel-white">Bonding Curve</CardTitle>
					<span className="text-xs text-smoke-dark">{progressPct.toFixed(1)}% to graduation</span>
				</div>
			</CardHeader>
			<CardContent>
				<div className="h-[200px]">
					<ResponsiveContainer width="100%" height="100%">
						<AreaChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
							<defs>
								<linearGradient id="curveGradient" x1="0" y1="0" x2="0" y2="1">
									<stop offset="0%" stopColor="#E8A317" stopOpacity={0.4} />
									<stop offset="100%" stopColor="#E8A317" stopOpacity={0.05} />
								</linearGradient>
							</defs>
							<XAxis
								dataKey="percentSold"
								tick={{ fill: "#6B7280", fontSize: 10 }}
								tickLine={false}
								axisLine={{ stroke: "#374151" }}
								tickFormatter={(v: number) => `${v}%`}
								interval={19}
							/>
							<YAxis
								tick={{ fill: "#6B7280", fontSize: 10 }}
								tickLine={false}
								axisLine={false}
								tickFormatter={(v: number) =>
									v >= 0.001 ? `$${v.toFixed(4)}` : `$${v.toExponential(1)}`
								}
								width={60}
							/>
							<Tooltip
								content={({ payload }) => {
									if (!payload?.[0]) return null;
									const d = payload[0].payload as CurveDataPoint;
									return (
										<div className="rounded border border-anvil-gray-light bg-obsidian-black p-2 text-xs">
											<p className="text-smoke-dark">{d.percentSold}% sold</p>
											<p className="text-molten-amber">${d.price.toFixed(6)}</p>
											<p className="text-smoke-dark">${d.usdcRaised.toLocaleString()} raised</p>
										</div>
									);
								}}
							/>
							{!graduated && (
								<ReferenceLine
									x={graduationPctSold}
									stroke="#10B981"
									strokeDasharray="4 4"
									strokeOpacity={0.6}
									label={{
										value: "Grad.",
										position: "top",
										fill: "#10B981",
										fontSize: 10,
									}}
								/>
							)}
							<ReferenceLine
								x={Math.round(currentPctSold)}
								stroke="#E8A317"
								strokeWidth={2}
								label={{
									value: `$${currentPrice.toFixed(6)}`,
									position: "top",
									fill: "#E8A317",
									fontSize: 10,
								}}
							/>
							<Area
								type="monotone"
								dataKey="price"
								stroke="#E8A317"
								strokeWidth={2}
								fill="url(#curveGradient)"
								dot={false}
								animationDuration={500}
							/>
						</AreaChart>
					</ResponsiveContainer>
				</div>
			</CardContent>
		</Card>
	);
}
