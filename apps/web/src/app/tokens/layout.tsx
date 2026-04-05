import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
	title: "Token Hub | FORJA",
	description:
		"Discover and explore tokens on the Tempo blockchain. Search, filter, and analyze token holders and activity.",
};

export default function TokensLayout({ children }: { children: ReactNode }) {
	return children;
}
