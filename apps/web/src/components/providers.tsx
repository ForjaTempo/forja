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
	accentColor: "#f0d38a",
	accentColorForeground: "#1a1307",
	borderRadius: "large",
	fontStack: "system",
	overlayBlur: "small",
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
									background: "var(--color-bg-elevated)",
									border: "1px solid var(--color-border-subtle)",
									color: "var(--color-text-primary)",
									fontSize: "13px",
								},
								classNames: {
									success: "[&_[data-icon]]:text-green",
									error: "[&_[data-icon]]:text-red",
									warning: "[&_[data-icon]]:text-gold",
									info: "[&_[data-icon]]:text-indigo",
								},
							}}
						/>
					</TooltipProvider>
				</RainbowKitProvider>
			</QueryClientProvider>
		</WagmiProvider>
	);
}
