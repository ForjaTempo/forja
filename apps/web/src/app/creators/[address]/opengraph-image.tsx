import { ImageResponse } from "next/og";
import { getCreatorProfile } from "@/actions/token-hub";

export const runtime = "nodejs";
export const alt = "FORJA Creator";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 3600;

function truncateAddress(address: string): string {
	return `${address.slice(0, 8)}...${address.slice(-6)}`;
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
					Creator Profile
				</div>
			</div>

			{/* Center: Creator info */}
			<div
				style={{
					display: "flex",
					alignItems: "center",
					flex: 1,
					gap: 40,
				}}
			>
				{/* Avatar placeholder */}
				<div
					style={{
						width: 120,
						height: 120,
						borderRadius: 60,
						backgroundColor: "#1F2937",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						fontSize: 48,
						fontWeight: 700,
						color: "#5b6ada",
						flexShrink: 0,
					}}
				>
					{address.slice(2, 4).toUpperCase()}
				</div>

				<div
					style={{
						display: "flex",
						flexDirection: "column",
						gap: 12,
					}}
				>
					<div
						style={{
							fontSize: 44,
							fontWeight: 700,
							color: "#F5F5F5",
							letterSpacing: "-0.02em",
						}}
					>
						{profile.displayName ?? truncateAddress(address)}
					</div>
					{profile.displayName && (
						<div
							style={{
								fontSize: 20,
								color: "#9CA3AF",
								fontFamily: "monospace",
							}}
						>
							{truncateAddress(address)}
						</div>
					)}
					<div
						style={{
							fontSize: 24,
							color: "#9CA3AF",
						}}
					>
						Token Creator on Tempo
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
					<div style={{ fontSize: 16, color: "#6B7280" }}>Tokens Created</div>
					<div style={{ fontSize: 28, fontWeight: 600, color: "#F5F5F5" }}>
						{(profile.tokensCreated ?? 0).toLocaleString()}
					</div>
				</div>
				<div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
					<div style={{ fontSize: 16, color: "#6B7280" }}>Multisends</div>
					<div style={{ fontSize: 28, fontWeight: 600, color: "#F5F5F5" }}>
						{(profile.multisendCount ?? 0).toLocaleString()}
					</div>
				</div>
				<div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
					<div style={{ fontSize: 16, color: "#6B7280" }}>Locks</div>
					<div style={{ fontSize: 28, fontWeight: 600, color: "#F5F5F5" }}>
						{(profile.lockCount ?? 0).toLocaleString()}
					</div>
				</div>
				{profile.totalValueLocked && (
					<div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
						<div style={{ fontSize: 16, color: "#6B7280" }}>Total Value Locked</div>
						<div style={{ fontSize: 28, fontWeight: 600, color: "#5b6ada" }}>
							{profile.totalValueLocked}
						</div>
					</div>
				)}
			</div>
		</div>,
		{ ...size },
	);
}
