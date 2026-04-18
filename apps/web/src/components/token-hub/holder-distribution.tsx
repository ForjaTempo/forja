"use client";

import { AlertTriangleIcon } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

interface HolderData {
	holderAddress: string;
	balance: string;
	percentage: number;
}

interface HolderDistributionProps {
	holders: HolderData[];
	isForjaCreated: boolean;
}

const COLORS = [
	"#f0d38a",
	"#e8b860",
	"#ff6b3d",
	"#818cf8",
	"#4ade80",
	"#a7b0c5",
	"#7a7e93",
	"#555970",
	"#3a3d52",
	"#1f2136",
];

function shortenAddress(address: string) {
	return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function HolderDistribution({ holders, isForjaCreated }: HolderDistributionProps) {
	if (!isForjaCreated) {
		return (
			<div className="rounded-2xl border border-border-hair bg-bg-elevated py-12 text-center">
				<p className="text-[13px] text-text-tertiary">
					Holder data is only available for FORJA-created tokens.
				</p>
			</div>
		);
	}

	if (holders.length === 0) {
		return (
			<div className="rounded-2xl border border-border-hair bg-bg-elevated py-12 text-center">
				<p className="text-[13px] text-text-tertiary">No holder data available.</p>
			</div>
		);
	}

	const topHolder = holders[0];
	const isHighConcentration = topHolder && topHolder.percentage > 50;

	const chartData = holders.map((h) => ({
		name: shortenAddress(h.holderAddress),
		value: h.percentage,
		address: h.holderAddress,
	}));

	const topSum = holders.reduce((sum, h) => sum + h.percentage, 0);
	if (topSum < 100) {
		chartData.push({
			name: "Others",
			value: Math.round((100 - topSum) * 100) / 100,
			address: "",
		});
	}

	return (
		<div className="space-y-4">
			{isHighConcentration && (
				<div className="flex items-center gap-2 rounded-xl border border-gold/30 bg-gold/10 p-3">
					<AlertTriangleIcon className="size-4 text-gold" />
					<span className="text-[13px] text-gold">
						High concentration — top holder owns {topHolder.percentage.toFixed(1)}% of supply.
					</span>
				</div>
			)}

			<div className="flex flex-col items-center gap-6 rounded-2xl border border-border-hair bg-bg-elevated p-6 lg:flex-row">
				<div className="h-64 w-full max-w-xs">
					<ResponsiveContainer width="100%" height="100%">
						<PieChart>
							<Pie
								data={chartData}
								cx="50%"
								cy="50%"
								outerRadius={80}
								dataKey="value"
								label={({ name, value }) => `${name} ${value}%`}
								labelLine={false}
							>
								{chartData.map((_, index) => (
									<Cell key={`cell-${index.toString()}`} fill={COLORS[index % COLORS.length]} />
								))}
							</Pie>
							<Tooltip
								formatter={(value) => `${Number(value).toFixed(2)}%`}
								contentStyle={{
									backgroundColor: "rgba(16,16,24,0.95)",
									border: "1px solid rgba(255,255,255,0.09)",
									borderRadius: "12px",
									fontSize: "12px",
								}}
							/>
						</PieChart>
					</ResponsiveContainer>
				</div>

				<div className="flex-1 space-y-1.5">
					{holders.map((h, i) => (
						<div
							key={h.holderAddress}
							className="flex items-center justify-between rounded-lg px-3 py-1.5 text-[13px] transition-colors hover:bg-bg-field/60"
						>
							<div className="flex items-center gap-2">
								<div
									className="size-3 rounded-full"
									style={{ backgroundColor: COLORS[i % COLORS.length] }}
								/>
								<span className="font-mono text-[12px] text-text-secondary">
									{shortenAddress(h.holderAddress)}
								</span>
							</div>
							<span className="font-mono text-[12px] text-text-primary">
								{h.percentage.toFixed(2)}%
							</span>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
