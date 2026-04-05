import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getTokenDetail } from "@/actions/token-hub";

interface Props {
	params: Promise<{ address: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const { address } = await params;
	const token = await getTokenDetail(address);

	if (!token) {
		return { title: "Token Not Found | FORJA" };
	}

	return {
		title: `${token.name} (${token.symbol}) | FORJA`,
		description: `View ${token.name} (${token.symbol}) token details, holders, and activity on Tempo blockchain.`,
	};
}

export default function TokenDetailLayout({ children }: { children: ReactNode }) {
	return children;
}
