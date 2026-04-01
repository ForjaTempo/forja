import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Multisend",
	description: "Send TIP-20 tokens to multiple recipients in a single transaction on Tempo",
};

export default function MultisendLayout({ children }: { children: React.ReactNode }) {
	return children;
}
