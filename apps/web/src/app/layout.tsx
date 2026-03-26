import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { Providers } from "@/components/providers";
import "./globals.css";

const inter = Inter({
	subsets: ["latin"],
	variable: "--font-inter",
	display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
	subsets: ["latin"],
	variable: "--font-jetbrains",
	display: "swap",
});

export const metadata: Metadata = {
	title: "FORJA - Token Toolkit for Tempo",
	description: "Create, Send, Lock tokens on Tempo blockchain",
	metadataBase: new URL("https://forja.fun"),
	openGraph: {
		title: "FORJA - Token Toolkit for Tempo",
		description: "Create, Send, Lock tokens on Tempo blockchain",
		siteName: "FORJA",
	},
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
			<body className="flex min-h-screen flex-col bg-forge-black font-sans text-steel-white antialiased">
				<Providers>
					<Header />
					<main className="flex-1">{children}</main>
					<Footer />
				</Providers>
			</body>
		</html>
	);
}
