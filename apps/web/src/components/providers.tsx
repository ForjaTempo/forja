"use client";

import { darkTheme, RainbowKitProvider } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";
import { Toaster } from "sonner";
import { WagmiProvider } from "wagmi";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/auth-context";
import { useWrongNetwork } from "@/hooks/use-wrong-network";
import { config } from "@/lib/wagmi";

const rainbowTheme = darkTheme({
	accentColor: "#5b6ada",
	accentColorForeground: "#ffffff",
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
						<AuthProvider>
							<NetworkGuard>{children}</NetworkGuard>
						</AuthProvider>
						<Toaster
							theme="dark"
							toastOptions={{
								style: {
									background: "var(--color-surface-card)",
									border: "1px solid var(--color-border-standard)",
									color: "var(--color-steel-white)",
								},
								classNames: {
									success: "[&_[data-icon]]:text-forge-green",
									error: "[&_[data-icon]]:text-ember-red",
									warning: "[&_[data-icon]]:text-molten-amber",
									info: "[&_[data-icon]]:text-info",
								},
							}}
						/>
					</TooltipProvider>
				</RainbowKitProvider>
			</QueryClientProvider>
		</WagmiProvider>
	);
}
