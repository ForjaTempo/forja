import { ImageResponse } from "next/og";
import { getCampaignBySlug } from "@/actions/claims";

export const runtime = "nodejs";
export const alt = "FORJA Claim Campaign";
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
		<rect x="14" y="6" width="4" height="4" rx="0.5" fill="#ff6b3d" />
	</svg>
);

const GOLD_TEXT_STYLE = {
	background: "linear-gradient(135deg, #ffe5a8, #f0d38a 50%, #e8b860)",
	backgroundClip: "text",
	color: "transparent",
} as const;

const PAGE_BG =
	"radial-gradient(circle at 25% 20%, rgba(255,107,61,0.22) 0%, transparent 55%), radial-gradient(circle at 80% 85%, rgba(240,211,138,0.12) 0%, transparent 55%), #0a0910";

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
				<div style={{ fontSize: 32, color: "#ededf0", marginTop: 16 }}>Campaign not found</div>
			</div>,
			{ ...size },
		);
	}

	const claimedPct =
		campaign.recipientCount > 0
			? Math.min(100, Math.round((campaign.claimedCount / campaign.recipientCount) * 100))
			: 0;

	const titleText = campaign.title.length > 50 ? `${campaign.title.slice(0, 50)}…` : campaign.title;
	const slugDisplay = `forja.fun/claim/${campaign.slug}`;

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
						justifyContent: "center",
						padding: "6px 18px",
						borderRadius: 999,
						background: "rgba(255,107,61,0.14)",
						border: "1px solid rgba(255,107,61,0.4)",
						color: "#ff6b3d",
						fontSize: 15,
						fontWeight: 600,
						letterSpacing: "0.18em",
						textTransform: "uppercase",
						fontFamily: "monospace",
					}}
				>
					Merkle claim
				</div>
			</div>

			<div
				style={{
					display: "flex",
					flexDirection: "column",
					flex: 1,
					gap: 24,
					justifyContent: "center",
				}}
			>
				<div
					style={{
						display: "flex",
						fontSize: 60,
						fontWeight: 400,
						color: "#ededf0",
						letterSpacing: "-0.02em",
						lineHeight: 1.05,
					}}
				>
					{titleText}
				</div>
				<div style={{ display: "flex", gap: 48 }}>
					<div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
						<div
							style={{
								display: "flex",
								fontSize: 13,
								color: "#7a7e93",
								letterSpacing: "0.14em",
								textTransform: "uppercase",
								fontFamily: "monospace",
							}}
						>
							Recipients
						</div>
						<div
							style={{
								display: "flex",
								fontSize: 32,
								fontWeight: 500,
								color: "#ededf0",
								fontFamily: "monospace",
							}}
						>
							{campaign.recipientCount.toLocaleString()}
						</div>
					</div>
					<div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
						<div
							style={{
								display: "flex",
								fontSize: 13,
								color: "#7a7e93",
								letterSpacing: "0.14em",
								textTransform: "uppercase",
								fontFamily: "monospace",
							}}
						>
							Claimed
						</div>
						<div
							style={{
								display: "flex",
								fontSize: 32,
								fontWeight: 500,
								fontFamily: "monospace",
								...GOLD_TEXT_STYLE,
							}}
						>
							{`${claimedPct}%`}
						</div>
					</div>
				</div>
			</div>

			<div
				style={{
					display: "flex",
					borderTop: "1px solid rgba(255,255,255,0.08)",
					paddingTop: 24,
				}}
			>
				<div
					style={{
						display: "flex",
						fontSize: 18,
						color: "#a7b0c5",
						fontFamily: "monospace",
						letterSpacing: "0.04em",
					}}
				>
					{slugDisplay}
				</div>
			</div>
		</div>,
		{ ...size },
	);
}
