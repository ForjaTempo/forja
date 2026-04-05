import type { Metadata } from "next";
import type { ReactNode } from "react";

interface Props {
	params: Promise<{ address: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const { address } = await params;
	const short = `${address.slice(0, 6)}...${address.slice(-4)}`;

	return {
		title: `Creator ${short} | FORJA`,
		description: `View tokens created by ${short} on the Tempo blockchain.`,
	};
}

export default function CreatorLayout({ children }: { children: ReactNode }) {
	return children;
}
