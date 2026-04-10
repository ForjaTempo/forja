import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCampaignBySlug, getCampaignStats } from "@/actions/claims";
import { ClaimPageClient } from "@/app/claim/[slug]/claim-page-client";
import { APP_URL } from "@/lib/constants";

interface Props {
	params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const { slug } = await params;
	const campaign = await getCampaignBySlug(slug);
	if (!campaign) return {};

	const title = `${campaign.title} — FORJA Claim`;
	const description =
		campaign.description?.slice(0, 200) ??
		`Claim your share of this airdrop on FORJA. ${campaign.recipientCount} eligible recipients.`;
	const url = `${APP_URL}/claim/${campaign.slug}`;

	return {
		title,
		description,
		twitter: {
			card: "summary_large_image",
			title,
			description,
			creator: "@forjatempo",
		},
		openGraph: {
			title,
			description,
			url,
			type: "website",
		},
	};
}

export default async function ClaimDetailPage({ params }: Props) {
	const { slug } = await params;
	const campaign = await getCampaignBySlug(slug);
	if (!campaign) notFound();

	const stats = await getCampaignStats(campaign.slug);

	return <ClaimPageClient initialCampaign={campaign} initialStats={stats} />;
}
