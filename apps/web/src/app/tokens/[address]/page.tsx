import { notFound } from "next/navigation";
import { getTokenDetail, getTokenHolderDistribution, getTokenTransfers } from "@/actions/token-hub";
import { TokenDetailClient } from "@/components/token-hub/token-detail-client";

interface Props {
	params: Promise<{ address: string }>;
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
