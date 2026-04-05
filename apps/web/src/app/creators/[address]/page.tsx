import { notFound } from "next/navigation";
import {
	getCreatorLocks,
	getCreatorMultisends,
	getCreatorProfile,
	getCreatorTokens,
} from "@/actions/token-hub";
import { CreatorPageClient } from "@/components/token-hub/creator-page-client";

interface Props {
	params: Promise<{ address: string }>;
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
