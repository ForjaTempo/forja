import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/**
 * Browser tab favicon — molten-gold anvil silhouette with an ember spark.
 * Mirrors <ForjaLogo /> so the tab, CTA, and header feel like one mark.
 */
export default function Icon() {
	return new ImageResponse(
		<div
			style={{
				width: "100%",
				height: "100%",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				background: "linear-gradient(135deg, #141218 0%, #0a0910 100%)",
				borderRadius: 7,
			}}
		>
			<svg
				width="26"
				height="26"
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
				<rect x="14" y="6" width="4" height="4" rx="0.5" fill="#ff6b3d" />
			</svg>
		</div>,
		{ ...size },
	);
}
