import { ImageResponse } from "next/og";
import { getTokenDetail } from "@/actions/token-hub";

export const runtime = "nodejs";
export const alt = "FORJA Token";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 3600;

export default async function TokenOgImage({ params }: { params: Promise<{ address: string }> }) {
	const { address } = await params;
	const token = await getTokenDetail(address);

	if (!token) {
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

	const initial = (token.symbol ?? "T").charAt(0).toUpperCase();

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
				<div
					style={{
						fontSize: 32,
						fontWeight: 700,
						color: "#5b6ada",
						letterSpacing: "-0.02em",
					}}
				>
					FORJA
				</div>
				<div
					style={{
						fontSize: 18,
						color: "#6B7280",
					}}
				>
					Token Toolkit for Tempo
				</div>
			</div>

			{/* Center: Token info */}
			<div
				style={{
					display: "flex",
					alignItems: "center",
					flex: 1,
					gap: 40,
				}}
			>
				{/* Token icon placeholder */}
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
						color: "#5b6ada",
						flexShrink: 0,
					}}
				>
					{initial}
				</div>

				<div
					style={{
						display: "flex",
						flexDirection: "column",
						gap: 8,
					}}
				>
					<div
						style={{
							fontSize: 52,
							fontWeight: 700,
							color: "#F5F5F5",
							letterSpacing: "-0.02em",
							lineHeight: 1.1,
						}}
					>
						{token.name}
					</div>
					<div
						style={{
							fontSize: 28,
							fontWeight: 500,
							color: "#9CA3AF",
						}}
					>
						{`$${token.symbol}`}
					</div>
				</div>
			</div>

			{/* Bottom: Stats */}
			<div
				style={{
					display: "flex",
					gap: 48,
					borderTop: "1px solid #374151",
					paddingTop: 32,
				}}
			>
				<div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
					<div style={{ fontSize: 16, color: "#6B7280" }}>Holders</div>
					<div style={{ fontSize: 28, fontWeight: 600, color: "#F5F5F5" }}>
						{(token.holderCount ?? 0).toLocaleString()}
					</div>
				</div>
				<div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
					<div style={{ fontSize: 16, color: "#6B7280" }}>Transfers</div>
					<div style={{ fontSize: 28, fontWeight: 600, color: "#F5F5F5" }}>
						{(token.transferCount ?? 0).toLocaleString()}
					</div>
				</div>
				{token.isForjaCreated && (
					<div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
						<div style={{ fontSize: 16, color: "#6B7280" }}>Created on</div>
						<div style={{ fontSize: 28, fontWeight: 600, color: "#5b6ada" }}>FORJA</div>
					</div>
				)}
			</div>
		</div>,
		{ ...size },
	);
}
