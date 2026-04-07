import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTokenDetail, getTokenHolderDistribution, getTokenTransfers } from "@/actions/token-hub";
import { TokenDetailClient } from "@/components/token-hub/token-detail-client";
import { APP_URL } from "@/lib/constants";

interface Props {
	params: Promise<{ address: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const { address } = await params;
	const token = await getTokenDetail(address);
	if (!token) return {};

	const title = `${token.name} ($${token.symbol}) — FORJA`;
	const description = `${token.name} token on Tempo blockchain. ${token.holderCount} holders, ${token.transferCount} transfers.`;
	const url = `${APP_URL}/tokens/${address}`;

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

export default async function TokenDetailPage({ params }: Props) {
	const { address } = await params;
	const token = await getTokenDetail(address);

	if (!token) {
		notFound();
	}

	const [holders, transferData] = await Promise.all([
		getTokenHolderDistribution(address),
		getTokenTransfers(address, { offset: 0, limit: 10 }),
	]);

	return (
		<TokenDetailClient
			initialToken={token}
			initialHolders={holders}
			initialTransfers={transferData}
		/>
	);
}
