"use client";

import { darkTheme, RainbowKitProvider } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";
import { Toaster } from "sonner";
import { WagmiProvider } from "wagmi";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useWrongNetwork } from "@/hooks/use-wrong-network";
import { config } from "@/lib/wagmi";

const rainbowTheme = darkTheme({
	accentColor: "#f59e0b",
	accentColorForeground: "#0f1116",
	borderRadius: "medium",
	fontStack: "system",
});

function NetworkGuard({ children }: { children: ReactNode }) {
	useWrongNetwork();
	return children;
}

export function Providers({ children }: { children: ReactNode }) {
	const [queryClient] = useState(() => new QueryClient());

	return (
		<WagmiProvider config={config}>
			<QueryClientProvider client={queryClient}>
				<RainbowKitProvider theme={rainbowTheme}>
					<TooltipProvider delayDuration={300}>
						<NetworkGuard>{children}</NetworkGuard>
						<Toaster
							theme="dark"
							toastOptions={{
								style: {
									background: "#1a1d25",
									border: "1px solid #242832",
									color: "#f5f5f5",
								},
							}}
						/>
					</TooltipProvider>
				</RainbowKitProvider>
			</QueryClientProvider>
		</WagmiProvider>
	);
}
