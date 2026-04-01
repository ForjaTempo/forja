import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Create Token",
	description: "Create a new TIP-20 token on Tempo blockchain with custom name, symbol, and supply",
};

export default function CreateLayout({ children }: { children: React.ReactNode }) {
	return children;
}
