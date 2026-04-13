import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "FORJA — Create. Send. Lock. Token Toolkit for Tempo";
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
				backgroundColor: "#0F1116",
			}}
		>
			<div
				style={{
					fontSize: 96,
					fontWeight: 700,
					color: "#5b6ada",
					letterSpacing: "-0.02em",
				}}
			>
				FORJA
			</div>
			<div
				style={{
					fontSize: 36,
					fontWeight: 500,
					color: "#F5F5F5",
					marginTop: 16,
				}}
			>
				Create. Send. Lock.
			</div>
			<div
				style={{
					fontSize: 22,
					color: "#9CA3AF",
					marginTop: 12,
				}}
			>
				Token Toolkit for Tempo Blockchain
			</div>
		</div>,
		{ ...size },
	);
}
