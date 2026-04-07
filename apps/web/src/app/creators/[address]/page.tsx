import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
	getCreatorLocks,
	getCreatorMultisends,
	getCreatorProfile,
	getCreatorTokens,
} from "@/actions/token-hub";
import { CreatorPageClient } from "@/components/token-hub/creator-page-client";
import { APP_URL } from "@/lib/constants";

interface Props {
	params: Promise<{ address: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const { address } = await params;
	const profile = await getCreatorProfile(address);
	if (!profile) return {};

	const truncated = `${address.slice(0, 8)}...${address.slice(-6)}`;
	const title = `Creator ${truncated} — FORJA`;
	const description = `${profile.tokensCreated} tokens created, ${profile.multisendCount} multisends, ${profile.lockCount} locks on Tempo.`;
	const url = `${APP_URL}/creators/${address}`;

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

export default async function CreatorPage({ params }: Props) {
	const { address } = await params;
	const profile = await getCreatorProfile(address);

	if (!profile) {
		notFound();
	}

	const [tokens, multisends, locks] = await Promise.all([
		getCreatorTokens(address),
		getCreatorMultisends(address),
		getCreatorLocks(address),
	]);

	return (
		<CreatorPageClient
			initialProfile={profile}
			initialTokens={tokens}
			initialMultisends={multisends}
			initialLocks={locks}
		/>
	);
}
