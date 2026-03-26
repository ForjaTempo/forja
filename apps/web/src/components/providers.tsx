"use client";

import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";
import { WagmiProvider } from "wagmi";
import { config } from "@/lib/wagmi";

const rainbowTheme = darkTheme({
	accentColor: "#f59e0b",
	accentColorForeground: "#0f1116",
	borderRadius: "medium",
	fontStack: "system",
});

export function Providers({ children }: { children: ReactNode }) {
	const [queryClient] = useState(() => new QueryClient());

	return (
		<WagmiProvider config={config}>
			<QueryClientProvider client={queryClient}>
				<RainbowKitProvider theme={rainbowTheme}>{children}</RainbowKitProvider>
			</QueryClientProvider>
		</WagmiProvider>
	);
}
