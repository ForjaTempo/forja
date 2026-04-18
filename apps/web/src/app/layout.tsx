import { OpenPanelComponent } from "@openpanel/nextjs";
import type { Metadata } from "next";
import { Geist, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { Providers } from "@/components/providers";
import { APP_DESCRIPTION, APP_NAME, APP_URL } from "@/lib/constants";
import { getNonce } from "@/lib/nonce";
import "./globals.css";

// Display — editorial serif used for headings, hero text, italic accent words
const instrumentSerif = Instrument_Serif({
	subsets: ["latin"],
	weight: "400",
	style: ["normal", "italic"],
	variable: "--font-display",
	display: "swap",
});

// Sans — modern neutral workhorse for body + UI
const geist = Geist({
	subsets: ["latin"],
	weight: ["300", "400", "500", "600", "700"],
	variable: "--font-sans",
	display: "swap",
});

// Mono — addresses, numbers, eyebrow labels
const jetbrainsMono = JetBrains_Mono({
	subsets: ["latin"],
	variable: "--font-mono",
	display: "swap",
});

export const metadata: Metadata = {
	title: {
		template: `%s | ${APP_NAME}`,
		default: `${APP_NAME} — Create. Send. Lock. Claim. Launch. | Token Platform for Tempo`,
	},
	description: APP_DESCRIPTION,
	metadataBase: new URL(APP_URL),
	keywords: [
		"tempo",
		"blockchain",
		"token",
		"TIP-20",
		"multisend",
		"token lock",
		"vesting",
		"claim",
		"launchpad",
	],
	openGraph: {
		title: `${APP_NAME} — Create. Send. Lock. Claim. Launch.`,
		description: APP_DESCRIPTION,
		url: APP_URL,
		siteName: APP_NAME,
		type: "website",
	},
	twitter: {
		card: "summary_large_image",
		title: `${APP_NAME} — Create. Send. Lock. Claim. Launch.`,
		description: APP_DESCRIPTION,
	},
};

const jsonLd = {
	"@context": "https://schema.org",
	"@type": "SoftwareApplication",
	name: APP_NAME,
	description: APP_DESCRIPTION,
	url: APP_URL,
	applicationCategory: "FinanceApplication",
	operatingSystem: "Web",
	offers: {
		"@type": "Offer",
		price: "0",
		priceCurrency: "USD",
	},
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
	const nonce = await getNonce();
	return (
		<html
			lang="en"
			className={`${geist.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable}`}
		>
			<body className="noise flex min-h-screen flex-col bg-bg-page font-sans text-text-primary antialiased">
				{process.env.NEXT_PUBLIC_OPENPANEL_CLIENT_ID && (
					<OpenPanelComponent
						clientId={process.env.NEXT_PUBLIC_OPENPANEL_CLIENT_ID}
						apiUrl={process.env.NEXT_PUBLIC_OPENPANEL_API_URL}
						trackScreenViews={true}
						trackOutgoingLinks={true}
						trackAttributes={true}
					/>
				)}
				<script
					type="application/ld+json"
					nonce={nonce}
					// biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD structured data
					dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
				/>
				<a
					href="#main-content"
					className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:font-medium focus:text-primary-foreground"
				>
					Skip to content
				</a>
				<Providers>
					<Header />
					<main id="main-content" className="flex-1 pt-[68px]">
						{children}
					</main>
					<Footer />
				</Providers>
			</body>
		</html>
	);
}
