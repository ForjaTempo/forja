import { getTokenHubStats, getTokenList } from "@/actions/token-hub";
import { TokensPageClient } from "@/components/token-hub/tokens-page-client";

interface Props {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function TokensPage({ searchParams }: Props) {
	const params = await searchParams;
	const search = typeof params.q === "string" ? params.q : "";
	const sort = typeof params.sort === "string" ? params.sort : "newest";
	const forjaOnly = params.forja === "1";

	const [initialData, stats] = await Promise.all([
		getTokenList({ search, sort: sort as "newest" | "oldest" | "holders" | "transfers", forjaOnly, offset: 0, limit: 20 }),
		getTokenHubStats(),
	]);

	return (
		<TokensPageClient
			initialData={initialData}
			initialStats={stats}
			initialSearch={search}
			initialSort={sort as "newest" | "oldest" | "holders" | "transfers"}
			initialForjaOnly={forjaOnly}
		/>
	);
}
