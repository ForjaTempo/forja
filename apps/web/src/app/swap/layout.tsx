import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Swap",
	description:
		"Trade any TIP-20 token on Tempo. Best route via Uniswap v4 + transparent 0.25% protocol fee.",
};

export default function SwapLayout({ children }: { children: React.ReactNode }) {
	return children;
}
