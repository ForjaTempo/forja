"use client";

import { AlertTriangleIcon } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Badge } from "@/components/ui/badge";

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
	"#E8A317", // molten-amber
	"#C4891A",
	"#A07015",
	"#7D5810",
	"#5A400B",
	"#6B7280",
	"#4B5563",
	"#374151",
	"#1F2937",
	"#111827",
];

function shortenAddress(address: string) {
	return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function HolderDistribution({ holders, isForjaCreated }: HolderDistributionProps) {
	if (!isForjaCreated) {
		return (
			<div className="py-12 text-center">
				<p className="text-sm text-smoke-dark">
					Holder data is only available for FORJA-created tokens
				</p>
			</div>
		);
	}

	if (holders.length === 0) {
		return (
			<div className="py-12 text-center">
				<p className="text-sm text-smoke-dark">No holder data available</p>
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

	// Add "Others" if top 10 < 100%
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
				<div className="flex items-center gap-2 rounded-lg border border-yellow-600/30 bg-yellow-600/10 p-3">
					<AlertTriangleIcon className="size-4 text-yellow-500" />
					<span className="text-sm text-yellow-500">
						High Concentration — Top holder owns {topHolder.percentage.toFixed(1)}% of supply
					</span>
				</div>
			)}

			<div className="flex flex-col items-center gap-6 lg:flex-row">
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
									<Cell
										key={`cell-${index.toString()}`}
										fill={COLORS[index % COLORS.length]}
									/>
								))}
							</Pie>
							<Tooltip
								formatter={(value: number) => `${value.toFixed(2)}%`}
								contentStyle={{
									backgroundColor: "#1a1a1a",
									border: "1px solid #333",
									borderRadius: "8px",
								}}
							/>
						</PieChart>
					</ResponsiveContainer>
				</div>

				<div className="flex-1 space-y-2">
					{holders.map((h, i) => (
						<div
							key={h.holderAddress}
							className="flex items-center justify-between rounded px-3 py-1.5 text-sm"
						>
							<div className="flex items-center gap-2">
								<div
									className="size-3 rounded-full"
									style={{ backgroundColor: COLORS[i % COLORS.length] }}
								/>
								<span className="font-mono text-xs text-smoke">
									{shortenAddress(h.holderAddress)}
								</span>
							</div>
							<span className="font-mono text-xs text-smoke-dark">
								{h.percentage.toFixed(2)}%
							</span>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
