import { ImageResponse } from "next/og";
import { getLaunchDetail } from "@/actions/launches";

export const runtime = "nodejs";
export const alt = "FORJA Launch";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 600;

const GRADUATION_THRESHOLD = 69_000_000_000n;

export default async function LaunchOgImage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const launchDbId = Number(id);
	const launch =
		Number.isFinite(launchDbId) && launchDbId > 0 ? await getLaunchDetail(launchDbId) : null;

	if (!launch) {
		return new ImageResponse(
			<div
				style={{
					width: "100%",
					height: "100%",
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					justifyContent: "center",
					backgroundColor: "#0F1116",
				}}
			>
				<div style={{ fontSize: 96, fontWeight: 700, color: "#F59E0B" }}>FORJA</div>
				<div style={{ fontSize: 36, fontWeight: 500, color: "#F5F5F5", marginTop: 16 }}>
					Token Launchpad
				</div>
			</div>,
			{ ...size },
		);
	}

	const raised = BigInt(launch.realUsdcRaised);
	const progressPct = Math.min(100, Number((raised * 10000n) / GRADUATION_THRESHOLD) / 100);
	const raisedFormatted = (Number(raised) / 1e6).toLocaleString("en-US", {
		maximumFractionDigits: 0,
	});
	const initial = (launch.symbol ?? "L").charAt(0).toUpperCase();

	const statusLabel = launch.graduated
		? "GRADUATED"
		: launch.killed || launch.failed
			? "ENDED"
			: "LIVE";
	const statusColor = launch.graduated
		? "#10B981"
		: launch.killed || launch.failed
			? "#EF4444"
			: "#F59E0B";

	return new ImageResponse(
		<div
			style={{
				width: "100%",
				height: "100%",
				display: "flex",
				flexDirection: "column",
				backgroundColor: "#0F1116",
				padding: "60px 80px",
			}}
		>
			{/* Top: FORJA branding */}
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					marginBottom: 48,
				}}
			>
				<div style={{ fontSize: 32, fontWeight: 700, color: "#F59E0B" }}>FORJA</div>
				<div
					style={{
						fontSize: 18,
						fontWeight: 600,
						color: statusColor,
						backgroundColor: `${statusColor}20`,
						padding: "4px 16px",
						borderRadius: 20,
					}}
				>
					{statusLabel}
				</div>
			</div>

			{/* Center: Launch info */}
			<div style={{ display: "flex", alignItems: "center", flex: 1, gap: 40 }}>
				<div
					style={{
						width: 120,
						height: 120,
						borderRadius: 24,
						backgroundColor: "#1F2937",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						fontSize: 56,
						fontWeight: 700,
						color: "#F59E0B",
						flexShrink: 0,
					}}
				>
					{initial}
				</div>

				<div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
					<div
						style={{
							fontSize: 52,
							fontWeight: 700,
							color: "#F5F5F5",
							letterSpacing: "-0.02em",
							lineHeight: 1.1,
						}}
					>
						{launch.name}
					</div>
					<div style={{ fontSize: 28, fontWeight: 500, color: "#9CA3AF" }}>
						{`$${launch.symbol}`}
					</div>
				</div>
			</div>

			{/* Bottom: Stats + Progress */}
			<div
				style={{
					display: "flex",
					gap: 48,
					borderTop: "1px solid #374151",
					paddingTop: 32,
					alignItems: "center",
				}}
			>
				<div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
					<div style={{ fontSize: 16, color: "#6B7280" }}>Raised</div>
					<div style={{ fontSize: 28, fontWeight: 600, color: "#F5F5F5" }}>
						{`$${raisedFormatted}`}
					</div>
				</div>
				<div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
					<div style={{ fontSize: 16, color: "#6B7280" }}>Progress</div>
					<div style={{ fontSize: 28, fontWeight: 600, color: "#F59E0B" }}>
						{`${progressPct.toFixed(1)}%`}
					</div>
				</div>
				<div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
					<div style={{ fontSize: 16, color: "#6B7280" }}>Trades</div>
					<div style={{ fontSize: 28, fontWeight: 600, color: "#F5F5F5" }}>
						{launch.tradeCount.toLocaleString()}
					</div>
				</div>
				<div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
					<div style={{ fontSize: 16, color: "#6B7280" }}>Traders</div>
					<div style={{ fontSize: 28, fontWeight: 600, color: "#F5F5F5" }}>
						{launch.uniqueTraders.toLocaleString()}
					</div>
				</div>
			</div>
		</div>,
		{ ...size },
	);
}
