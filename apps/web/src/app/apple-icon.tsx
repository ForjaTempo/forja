import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/**
 * iOS home-screen icon — same anvil+ember mark as the favicon, scaled up
 * with a softer rounded-corner tile for the iOS aesthetic.
 */
export default function AppleIcon() {
	return new ImageResponse(
		<div
			style={{
				width: "100%",
				height: "100%",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				background: "linear-gradient(135deg, #141218 0%, #0a0910 100%)",
				borderRadius: 40,
			}}
		>
			<svg
				width="140"
				height="140"
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
