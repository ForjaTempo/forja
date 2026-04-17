import { getTokenHubStats, getTokenList, getTrendingTokens } from "@/actions/token-hub";
import { TokensPageClient } from "@/components/token-hub/tokens-page-client";

interface Props {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function TokensPage({ searchParams }: Props) {
	// searchParams are parsed on the client. Server just fetches the default view.
	await searchParams;

	const [initialData, stats, initialTrending] = await Promise.all([
		getTokenList({ offset: 0, limit: 20 }),
		getTokenHubStats(),
		getTrendingTokens(6),
	]);

	return (
		<TokensPageClient
			initialData={initialData}
			initialStats={stats}
			initialTrending={initialTrending}
		/>
	);
}
