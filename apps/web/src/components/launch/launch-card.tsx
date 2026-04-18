"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { LaunchListItem } from "@/actions/launches";
import { TIP20_DECIMALS } from "@/lib/constants";

const GRADUATION_THRESHOLD = 69_000_000_000n; // 69K USDC in raw units (6 decimals)
const TOTAL_SUPPLY = 1_000_000_000; // 1B tokens

const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

function shortenAddress(addr: string): string {
	return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function calcMarketCap(virtualTokens: string, virtualUsdc: string): string {
	const vt = Number(BigInt(virtualTokens)) / 10 ** TIP20_DECIMALS;
	const vu = Number(BigInt(virtualUsdc)) / 10 ** TIP20_DECIMALS;
	if (vt === 0) return "$0";
	const price = vu / vt;
	const mcap = price * TOTAL_SUPPLY;
	return `$${compact.format(mcap)}`;
}

function calcPrice(virtualTokens: string, virtualUsdc: string): number {
	const vt = Number(BigInt(virtualTokens)) / 10 ** TIP20_DECIMALS;
	const vu = Number(BigInt(virtualUsdc)) / 10 ** TIP20_DECIMALS;
	if (vt === 0) return 0;
	return vu / vt;
}

/** Deterministic launchpad-palette colour for a token given its symbol. */
function colourFor(seed: string): string {
	const palette = [
		"#f472b6", // pink (primary)
		"#a78bfa", // purple
		"#818cf8", // indigo
		"#f0d38a", // gold
		"#ff6b3d", // ember
		"#4ade80", // green
		"#60a5fa", // sky
		"#fb7185", // rose
	];
	let h = 0;
	for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
	return palette[Math.abs(h) % palette.length] ?? "#f472b6";
}

/** Generate a gentle synthetic sparkline series derived from the launch data.
 * We don't have historical price points in LaunchListItem, so we shape a curve
 * that reflects the token's current momentum (volume + progress). */
function syntheticSeries(launch: LaunchListItem, progressPct: number): number[] {
	const vol = Number(BigInt(launch.volume24h)) / 10 ** TIP20_DECIMALS;
	const trades = launch.tradeCount;
	// Bias base on progress; add noise seeded by symbol length + trade count.
	const base = Math.max(4, progressPct / 2);
	const topBoost = Math.min(80, progressPct);
	const seed = (launch.symbol.length + trades + Math.floor(vol)) % 97;
	const out: number[] = [];
	for (let i = 0; i < 13; i++) {
		const t = i / 12;
		const wiggle = Math.sin((i + seed) * 0.9) * 3;
		out.push(base + topBoost * t + wiggle);
	}
	return out;
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
	const id = useMemo(() => `sl-${Math.random().toString(36).slice(2, 9)}`, []);
	const max = Math.max(...data);
	const min = Math.min(...data);
	const range = max - min || 1;
	const pts = data
		.map((v, i) => `${(i / (data.length - 1)) * 100},${100 - ((v - min) / range) * 100}`)
		.join(" ");
	return (
		<svg
			viewBox="0 0 100 100"
			preserveAspectRatio="none"
			role="img"
			aria-label="price sparkline"
			className="block h-10 w-full"
		>
			<title>price sparkline</title>
			<defs>
				<linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
					<stop offset="0" stopColor={color} stopOpacity="0.3" />
					<stop offset="1" stopColor={color} stopOpacity="0" />
				</linearGradient>
			</defs>
			<polygon points={`0,100 ${pts} 100,100`} fill={`url(#${id})`} />
			<polyline
				points={pts}
				fill="none"
				stroke={color}
				strokeWidth="1.5"
				strokeLinecap="round"
				vectorEffect="non-scaling-stroke"
			/>
		</svg>
	);
}

function TokenIcon({
	symbol,
	color,
	imageUri,
}: {
	symbol: string;
	color: string;
	imageUri: string | null;
}) {
	if (imageUri) {
		return (
			// biome-ignore lint/performance/noImgElement: user-provided external URL, no remote pattern config
			<img
				src={imageUri}
				alt={symbol}
				className="size-10 shrink-0 rounded-full object-cover"
				style={{ boxShadow: `0 4px 20px ${color}30` }}
			/>
		);
	}
	return (
		<div
			className="flex size-10 shrink-0 items-center justify-center rounded-full font-display text-base font-semibold"
			style={{
				background: `linear-gradient(135deg, ${color}, ${color}88)`,
				color: "#1a1307",
				boxShadow: `0 4px 20px ${color}30`,
			}}
		>
			{symbol.slice(0, 2).toUpperCase()}
		</div>
	);
}

interface LaunchCardProps {
	launch: LaunchListItem;
}

export function LaunchCard({ launch }: LaunchCardProps) {
	const [hovered, setHovered] = useState(false);
	const raised = BigInt(launch.realUsdcRaised);
	const progressPct = Math.min(100, Number((raised * 10000n) / GRADUATION_THRESHOLD) / 100);
	const color = colourFor(launch.symbol);
	const series = useMemo(() => syntheticSeries(launch, progressPct), [launch, progressPct]);
	const price = calcPrice(launch.virtualTokens, launch.virtualUsdc);
	const isGraduated = launch.graduated;
	const isTerminated = launch.killed || launch.failed;

	const statusLabel = isGraduated
		? "Graduated"
		: launch.killed
			? "Killed"
			: launch.failed
				? "Failed"
				: null;

	return (
		<Link
			href={`/launch/${launch.id}`}
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => setHovered(false)}
			className="block"
		>
			<div
				className="relative overflow-hidden rounded-2xl border bg-bg-elevated p-6 transition-transform duration-300"
				style={{
					borderColor: hovered ? `${color}55` : "var(--color-border-hair)",
					transform: hovered ? "translateY(-4px)" : "translateY(0)",
					transitionTimingFunction: "var(--ease-out)",
				}}
			>
				{/* Top-right radial glow */}
				<div
					aria-hidden
					className="pointer-events-none absolute -right-10 -top-10 size-[200px] blur-[30px] transition-opacity duration-500"
					style={{
						background: `radial-gradient(circle, ${color}22, transparent 70%)`,
						opacity: hovered ? 1 : 0.5,
					}}
				/>

				{/* Header row */}
				<div className="relative mb-[18px] flex items-center gap-[14px]">
					<TokenIcon symbol={launch.symbol} color={color} imageUri={launch.imageUri} />
					<div className="min-w-0 flex-1">
						<div className="flex items-baseline gap-2">
							<span className="truncate font-display text-[22px] tracking-[-0.02em] text-text-primary">
								{launch.symbol}
							</span>
							{statusLabel && (
								<span
									className="rounded-sm px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em]"
									style={{
										background: isGraduated ? "rgba(74,222,128,0.15)" : "rgba(248,113,113,0.15)",
										color: isGraduated ? "var(--color-green)" : "var(--color-red)",
									}}
								>
									{statusLabel}
								</span>
							)}
						</div>
						<div className="truncate text-[13px] text-text-tertiary">
							{launch.name}
							{launch.creatorDisplayName && (
								<span className="text-text-tertiary/70"> · by {launch.creatorDisplayName}</span>
							)}
						</div>
					</div>
					<div className="shrink-0 text-right">
						<div className="font-mono text-sm text-text-primary">
							{price > 0 ? `$${price.toFixed(price < 0.01 ? 6 : 4)}` : "—"}
						</div>
						<div className="font-mono text-xs" style={{ color: "var(--color-text-tertiary)" }}>
							{launch.tradeCount} trades
						</div>
					</div>
				</div>

				{/* Sparkline */}
				<div className="relative mb-[18px] h-10">
					<Sparkline data={series} color={color} />
				</div>

				{/* Bond progress — hidden for graduated/terminated */}
				{!isGraduated && !isTerminated && (
					<>
						<div className="relative mb-1.5 flex justify-between font-mono text-[11px] uppercase tracking-[0.1em] text-text-tertiary">
							<span>Bond progress</span>
							<span style={{ color }}>{progressPct.toFixed(1)}%</span>
						</div>
						<div className="relative mb-3.5 h-1 overflow-hidden rounded-sm bg-bg-field">
							<div
								className="h-full"
								style={{
									width: `${progressPct}%`,
									background: `linear-gradient(90deg, ${color}, ${color}aa)`,
									boxShadow: `0 0 8px ${color}60`,
								}}
							/>
						</div>
					</>
				)}

				{/* Mcap / holders split */}
				<div className="relative grid grid-cols-2 gap-2 border-t border-border-hair pt-3.5">
					<div>
						<div className="font-mono text-[10px] uppercase tracking-[0.1em] text-text-tertiary">
							Market cap
						</div>
						<div className="font-mono text-sm text-text-primary">
							{calcMarketCap(launch.virtualTokens, launch.virtualUsdc)}
						</div>
					</div>
					<div>
						<div className="font-mono text-[10px] uppercase tracking-[0.1em] text-text-tertiary">
							Creator
						</div>
						<div className="truncate font-mono text-sm text-text-primary">
							{launch.creatorDisplayName ?? shortenAddress(launch.creatorAddress)}
						</div>
					</div>
				</div>
			</div>
		</Link>
	);
}
