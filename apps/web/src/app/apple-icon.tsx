import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
	return new ImageResponse(
		<div
			style={{
				width: "100%",
				height: "100%",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				backgroundColor: "#0F1116",
				borderRadius: 40,
			}}
		>
			<div
				style={{
					fontSize: 120,
					fontWeight: 700,
					color: "#F59E0B",
				}}
			>
				F
			</div>
		</div>,
		{ ...size },
	);
}
