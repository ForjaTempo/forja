import { ImageResponse } from "next/og";
import { getCreatorProfile } from "@/actions/token-hub";

export const runtime = "nodejs";
export const alt = "FORJA Creator";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 3600;

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
		<path
			d="M16 2.2 C 13.6 4.2, 12.6 6.4, 13.6 8.6 C 14.2 9.8, 15.1 9.4, 14.9 8.2 C 15.3 9.1, 15.8 9.1, 16 8.3 C 16.2 9.1, 16.7 9.1, 17.1 8.2 C 16.9 9.4, 17.8 9.8, 18.4 8.6 C 19.4 6.4, 18.4 4.2, 16 2.2 Z"
			fill="#ff6b3d"
		/>
	</svg>
);

const GOLD_TEXT_STYLE = {
	background: "linear-gradient(135deg, #ffe5a8, #f0d38a 50%, #e8b860)",
	backgroundClip: "text",
	color: "transparent",
} as const;

const PAGE_BG =
	"radial-gradient(circle at 25% 20%, rgba(129,140,248,0.18) 0%, transparent 55%), radial-gradient(circle at 80% 85%, rgba(240,211,138,0.12) 0%, transparent 55%), #0a0910";

function truncateAddress(address: string): string {
	return `${address.slice(0, 8)}…${address.slice(-6)}`;
}

export default async function CreatorOgImage({ params }: { params: Promise<{ address: string }> }) {
	const { address } = await params;
	const profile = await getCreatorProfile(address);

	if (!profile) {
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
				<div style={{ fontSize: 32, color: "#ededf0", marginTop: 16 }}>Creator not found</div>
			</div>,
			{ ...size },
		);
	}

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
						fontSize: 15,
						color: "#7a7e93",
						letterSpacing: "0.14em",
						textTransform: "uppercase",
						fontFamily: "monospace",
					}}
				>
					Creator · Tempo
				</div>
			</div>

			<div style={{ display: "flex", alignItems: "center", flex: 1, gap: 40 }}>
				<div
					style={{
						width: 130,
						height: 130,
						borderRadius: 65,
						background: "linear-gradient(135deg, rgba(129,140,248,0.3), rgba(129,140,248,0.1))",
						border: "1px solid rgba(129,140,248,0.4)",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						fontSize: 52,
						fontWeight: 700,
						color: "#818cf8",
						flexShrink: 0,
					}}
				>
					{address.slice(2, 4).toUpperCase()}
				</div>

				<div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
					<div
						style={{
							fontSize: 54,
							fontWeight: 400,
							color: "#ededf0",
							letterSpacing: "-0.02em",
							lineHeight: 1.05,
						}}
					>
						{profile.displayName ?? truncateAddress(address)}
					</div>
					{profile.displayName && (
						<div
							style={{
								fontSize: 18,
								color: "#a7b0c5",
								fontFamily: "monospace",
								letterSpacing: "0.04em",
							}}
						>
							{truncateAddress(address)}
						</div>
					)}
					<div
						style={{
							fontSize: 16,
							color: "#7a7e93",
							letterSpacing: "0.14em",
							textTransform: "uppercase",
							fontFamily: "monospace",
						}}
					>
						Token creator · Tempo
					</div>
				</div>
			</div>

			<div
				style={{
					display: "flex",
					gap: 48,
					borderTop: "1px solid rgba(255,255,255,0.08)",
					paddingTop: 32,
				}}
			>
				<StatCol label="Tokens" value={(profile.tokensCreated ?? 0).toLocaleString()} />
				<StatCol label="Multisends" value={(profile.multisendCount ?? 0).toLocaleString()} />
				<StatCol label="Locks" value={(profile.lockCount ?? 0).toLocaleString()} />
				{profile.totalValueLocked && (
					<StatCol
						label="Value locked"
						value={profile.totalValueLocked}
						valueStyle={GOLD_TEXT_STYLE}
					/>
				)}
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
