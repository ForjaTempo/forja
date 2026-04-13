import { ImageResponse } from "next/og";
import { getCampaignBySlug } from "@/actions/claims";

export const runtime = "nodejs";
export const alt = "FORJA Claim Campaign";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 3600;

export default async function ClaimOgImage({ params }: { params: Promise<{ slug: string }> }) {
	const { slug } = await params;
	const campaign = await getCampaignBySlug(slug);

	if (!campaign) {
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
						display: "flex",
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
						display: "flex",
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
						display: "flex",
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

	const claimedPct =
		campaign.recipientCount > 0
			? Math.min(100, Math.round((campaign.claimedCount / campaign.recipientCount) * 100))
			: 0;

	const titleText =
		campaign.title.length > 50 ? `${campaign.title.slice(0, 50)}...` : campaign.title;
	const slugDisplay = `forja.fun/claim/${campaign.slug}`;

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
			{/* Top: FORJA branding + Claim badge */}
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
						display: "flex",
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
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						padding: "8px 20px",
						borderRadius: 9999,
						backgroundColor: "#1F2937",
						color: "#5b6ada",
						fontSize: 18,
						fontWeight: 600,
					}}
				>
					Claim Campaign
				</div>
			</div>

			{/* Center: title + recipient stats */}
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					flex: 1,
					gap: 16,
					justifyContent: "center",
				}}
			>
				<div
					style={{
						display: "flex",
						fontSize: 60,
						fontWeight: 700,
						color: "#F5F5F5",
						letterSpacing: "-0.02em",
						lineHeight: 1.1,
					}}
				>
					{titleText}
				</div>
				<div
					style={{
						display: "flex",
						gap: 32,
						marginTop: 16,
					}}
				>
					<div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
						<div style={{ display: "flex", fontSize: 16, color: "#6B7280" }}>Recipients</div>
						<div style={{ display: "flex", fontSize: 32, fontWeight: 600, color: "#F5F5F5" }}>
							{campaign.recipientCount.toLocaleString()}
						</div>
					</div>
					<div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
						<div style={{ display: "flex", fontSize: 16, color: "#6B7280" }}>Claimed</div>
						<div style={{ display: "flex", fontSize: 32, fontWeight: 600, color: "#5b6ada" }}>
							{`${claimedPct}%`}
						</div>
					</div>
				</div>
			</div>

			{/* Bottom: slug */}
			<div
				style={{
					display: "flex",
					borderTop: "1px solid #374151",
					paddingTop: 32,
				}}
			>
				<div style={{ display: "flex", fontSize: 22, color: "#9CA3AF" }}>{slugDisplay}</div>
			</div>
		</div>,
		{ ...size },
	);
}
