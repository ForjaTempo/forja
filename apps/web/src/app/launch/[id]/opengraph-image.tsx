import { ImageResponse } from "next/og";
import { getLaunchDetail } from "@/actions/launches";

export const runtime = "nodejs";
export const alt = "FORJA Launch";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 600;

const GRADUATION_THRESHOLD = 69_000_000_000n;

const FORJA_MARK = (
	<svg width="48" height="48" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
		<title>Forja</title>
		<defs>
			<linearGradient id="forjaGold" x1="0" x2="1" y1="0" y2="1">
				<stop offset="0" stopColor="#ffe5a8" />
				<stop offset="0.5" stopColor="#f0d38a" />
				<stop offset="1" stopColor="#e8b860" />
			</linearGradient>
		</defs>
		<path
			d="M4 10 L28 10 L26 14 L22 14 L22 20 L25 23 L25 26 L7 26 L7 23 L10 20 L10 14 L6 14 Z"
			fill="url(#forjaGold)"
		/>
		<rect x="14" y="6" width="4" height="4" rx="0.5" fill="#ff6b3d" />
	</svg>
);

const GOLD_TEXT_STYLE = {
	background: "linear-gradient(135deg, #ffe5a8, #f0d38a 50%, #e8b860)",
	backgroundClip: "text",
	color: "transparent",
} as const;

const PAGE_BG =
	"radial-gradient(circle at 30% 20%, rgba(244,114,182,0.18) 0%, transparent 55%), radial-gradient(circle at 75% 80%, rgba(167,139,250,0.15) 0%, transparent 55%), #0a0910";

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
					background: PAGE_BG,
				}}
			>
				<div style={{ display: "flex", alignItems: "center", gap: 24 }}>
					{FORJA_MARK}
					<div
						style={{
							fontSize: 110,
							fontWeight: 400,
							letterSpacing: "-0.04em",
							lineHeight: 1,
							...GOLD_TEXT_STYLE,
						}}
					>
						Forja
					</div>
				</div>
				<div style={{ fontSize: 32, color: "#ededf0", marginTop: 16 }}>Launchpad</div>
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

	const { statusLabel, statusColor, statusBg, statusBorder } = launch.graduated
		? {
				statusLabel: "GRADUATED",
				statusColor: "#4ade80",
				statusBg: "rgba(74,222,128,0.12)",
				statusBorder: "rgba(74,222,128,0.35)",
			}
		: launch.killed || launch.failed
			? {
					statusLabel: "ENDED",
					statusColor: "#f87171",
					statusBg: "rgba(248,113,113,0.12)",
					statusBorder: "rgba(248,113,113,0.35)",
				}
			: {
					statusLabel: "LIVE",
					statusColor: "#f472b6",
					statusBg: "rgba(244,114,182,0.14)",
					statusBorder: "rgba(244,114,182,0.4)",
				};

	return new ImageResponse(
		<div
			style={{
				width: "100%",
				height: "100%",
				display: "flex",
				flexDirection: "column",
				background: PAGE_BG,
				padding: "60px 80px",
			}}
		>
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					marginBottom: 48,
				}}
			>
				<div style={{ display: "flex", alignItems: "center", gap: 14 }}>
					{FORJA_MARK}
					<div
						style={{
							fontSize: 36,
							fontWeight: 400,
							letterSpacing: "-0.02em",
							...GOLD_TEXT_STYLE,
						}}
					>
						Forja
					</div>
				</div>
				<div
					style={{
						display: "flex",
						alignItems: "center",
						fontSize: 16,
						fontWeight: 600,
						color: statusColor,
						background: statusBg,
						border: `1px solid ${statusBorder}`,
						padding: "6px 18px",
						borderRadius: 999,
						letterSpacing: "0.18em",
						fontFamily: "monospace",
					}}
				>
					{statusLabel}
				</div>
			</div>

			<div style={{ display: "flex", alignItems: "center", flex: 1, gap: 40 }}>
				<div
					style={{
						width: 130,
						height: 130,
						borderRadius: 28,
						background: "linear-gradient(135deg, rgba(244,114,182,0.25), rgba(167,139,250,0.12))",
						border: "1px solid rgba(244,114,182,0.35)",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						fontSize: 64,
						fontWeight: 700,
						color: "#f472b6",
						flexShrink: 0,
					}}
				>
					{initial}
				</div>

				<div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
					<div
						style={{
							fontSize: 62,
							fontWeight: 400,
							color: "#ededf0",
							letterSpacing: "-0.02em",
							lineHeight: 1.05,
						}}
					>
						{launch.name}
					</div>
					<div
						style={{
							fontSize: 22,
							fontWeight: 500,
							color: "#f472b6",
							letterSpacing: "0.12em",
							textTransform: "uppercase",
							fontFamily: "monospace",
						}}
					>
						${launch.symbol}
					</div>
				</div>
			</div>

			<div
				style={{
					display: "flex",
					gap: 48,
					borderTop: "1px solid rgba(255,255,255,0.08)",
					paddingTop: 32,
					alignItems: "center",
				}}
			>
				<StatCol label="Raised" value={`$${raisedFormatted}`} />
				<StatCol
					label="Progress"
					value={`${progressPct.toFixed(1)}%`}
					valueStyle={GOLD_TEXT_STYLE}
				/>
				<StatCol label="Trades" value={launch.tradeCount.toLocaleString()} />
				<StatCol label="Traders" value={launch.uniqueTraders.toLocaleString()} />
			</div>
		</div>,
		{ ...size },
	);
}

function StatCol({
	label,
	value,
	valueStyle,
}: {
	label: string;
	value: string;
	valueStyle?: Record<string, string | number>;
}) {
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
			<div
				style={{
					fontSize: 13,
					color: "#7a7e93",
					letterSpacing: "0.14em",
					textTransform: "uppercase",
					fontFamily: "monospace",
				}}
			>
				{label}
			</div>
			<div
				style={{
					fontSize: 30,
					fontWeight: 500,
					color: "#ededf0",
					fontFamily: "monospace",
					...(valueStyle ?? {}),
				}}
			>
				{value}
			</div>
		</div>
	);
}
