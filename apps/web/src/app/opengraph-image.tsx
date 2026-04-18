import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "FORJA — Create. Send. Lock. Claim. Launch. Trade. Token toolkit for Tempo.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
	return new ImageResponse(
		<div
			style={{
				width: "100%",
				height: "100%",
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "center",
				background:
					"radial-gradient(circle at 30% 20%, rgba(240,211,138,0.18) 0%, transparent 55%), radial-gradient(circle at 75% 80%, rgba(255,107,61,0.12) 0%, transparent 55%), #0a0910",
				position: "relative",
			}}
		>
			<div style={{ display: "flex", alignItems: "center", gap: 24, marginBottom: 12 }}>
				<svg
					width="120"
					height="120"
					viewBox="0 0 32 32"
					fill="none"
					xmlns="http://www.w3.org/2000/svg"
				>
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
				<div
					style={{
						fontSize: 140,
						fontWeight: 400,
						letterSpacing: "-0.04em",
						lineHeight: 1,
						background: "linear-gradient(135deg, #ffe5a8, #f0d38a 50%, #e8b860)",
						backgroundClip: "text",
						color: "transparent",
					}}
				>
					Forja
				</div>
			</div>
			<div
				style={{
					fontSize: 34,
					fontWeight: 500,
					color: "#ededf0",
					letterSpacing: "-0.01em",
					marginTop: 8,
				}}
			>
				Create. Send. Lock. Claim. Launch. Trade.
			</div>
			<div
				style={{
					fontSize: 22,
					color: "#7a7e93",
					marginTop: 16,
					letterSpacing: "0.02em",
					textTransform: "uppercase",
					fontFamily: "monospace",
				}}
			>
				Token toolkit · Tempo mainnet
			</div>
		</div>,
		{ ...size },
	);
}
