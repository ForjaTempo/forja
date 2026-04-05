import { getTokenHubStats, getTokenList } from "@/actions/token-hub";
import { TokensPageClient } from "@/components/token-hub/tokens-page-client";

type SortOption = "newest" | "oldest" | "holders" | "transfers";

const VALID_SORTS = new Set<string>(["newest", "oldest", "holders", "transfers"]);

interface Props {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function TokensPage({ searchParams }: Props) {
	const params = await searchParams;
	const search = typeof params.q === "string" ? params.q : "";
	const sortRaw = typeof params.sort === "string" ? params.sort : "newest";
	const sort: SortOption = VALID_SORTS.has(sortRaw) ? (sortRaw as SortOption) : "newest";
	const forjaOnly = params.forja === "1";

	const [initialData, stats] = await Promise.all([
		getTokenList({ search, sort, forjaOnly, offset: 0, limit: 20 }),
		getTokenHubStats(),
	]);

	return <TokensPageClient initialData={initialData} initialStats={stats} />;
}
