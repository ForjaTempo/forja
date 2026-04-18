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

	const soldAmount = useMemo(() => {
		try {
			return Number(BigInt(realTokensSold)) / 1e6;
		} catch {
			return 0;
		}
	}, [realTokensSold]);

	const currentPctSold = useMemo(
		() => Math.min(100, (soldAmount / CURVE_SUPPLY) * 100),
		[soldAmount],
	);

	const currentPrice = useMemo(() => {
		const virtualTokens = VIRTUAL_TOKEN_RESERVE - soldAmount;
		const virtualUsdc = K / virtualTokens;
		return virtualUsdc / virtualTokens;
	}, [soldAmount]);

	const graduationPctSold = useMemo(() => {
		for (const point of data) {
			if (point.usdcRaised >= GRADUATION_THRESHOLD) {
				return point.percentSold;
			}
		}
		return 100;
	}, [data]);

	const progressPct = useMemo(() => {
		try {
			const raised = Number(BigInt(realUsdcRaised)) / 1e6;
			return Math.min(100, (raised / GRADUATION_THRESHOLD) * 100);
		} catch {
			return 0;
		}
	}, [realUsdcRaised]);

	const hasActivity = soldAmount > 0 || graduated;

	return (
		<div className="rounded-2xl border border-border-hair bg-bg-elevated p-5">
			<div className="mb-4 flex items-center justify-between">
				<div className="font-mono text-[10px] text-text-tertiary uppercase tracking-[0.14em]">
					Bonding curve
				</div>
				<span className="font-mono text-[11px] text-text-tertiary">
					{progressPct.toFixed(1)}% to graduation
				</span>
			</div>
			<div className="h-[200px]">
				<ResponsiveContainer width="100%" height="100%">
					<AreaChart data={data} margin={{ top: 20, right: 5, bottom: 5, left: 5 }}>
						<defs>
							<linearGradient id="curveGradient" x1="0" y1="0" x2="0" y2="1">
								<stop offset="0%" stopColor="#f472b6" stopOpacity={0.4} />
								<stop offset="100%" stopColor="#f472b6" stopOpacity={0.03} />
							</linearGradient>
						</defs>
						<XAxis
							dataKey="percentSold"
							tick={{ fill: "#7a7e93", fontSize: 10 }}
							tickLine={false}
							axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
							tickFormatter={(v: number) => `${v}%`}
							interval={19}
						/>
						<YAxis
							tick={{ fill: "#7a7e93", fontSize: 10 }}
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
									<div className="rounded-xl border border-border-subtle bg-bg-elevated px-3 py-2 font-mono text-[11px] shadow-lg">
										<p className="text-text-tertiary">{d.percentSold}% sold</p>
										<p className="mt-0.5" style={{ color: "#f472b6" }}>
											${d.price.toFixed(6)}
										</p>
										<p className="mt-0.5 text-text-tertiary">
											${d.usdcRaised.toLocaleString()} raised
										</p>
									</div>
								);
							}}
						/>
						{!graduated && (
							<ReferenceLine
								x={graduationPctSold}
								stroke="#4ade80"
								strokeDasharray="4 4"
								strokeOpacity={0.55}
								label={{
									value: "Graduate",
									position: "top",
									fill: "#4ade80",
									fontSize: 10,
								}}
							/>
						)}
						{hasActivity && (
							<ReferenceLine
								x={Math.round(currentPctSold)}
								stroke="#f472b6"
								strokeWidth={2}
								label={{
									value: `$${currentPrice.toFixed(6)}`,
									position: "top",
									fill: "#f472b6",
									fontSize: 10,
								}}
							/>
						)}
						<Area
							type="monotone"
							dataKey="price"
							stroke="#f472b6"
							strokeWidth={2}
							fill="url(#curveGradient)"
							dot={false}
							animationDuration={500}
						/>
					</AreaChart>
				</ResponsiveContainer>
			</div>
		</div>
	);
}
