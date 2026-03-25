import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "FORJA - Token Toolkit for Tempo",
	description: "Create, Send, Lock tokens on Tempo blockchain",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<body>{children}</body>
		</html>
	);
}
