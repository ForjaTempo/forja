"use client";

import { darkTheme, RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";
import { Toaster } from "sonner";
import { WagmiProvider } from "wagmi";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/auth-context";
import { useWrongNetwork } from "@/hooks/use-wrong-network";
import { config } from "@/lib/wagmi";

/**
 * RainbowKit's <Theme> object exposes ~30 color tokens that drive every
 * surface of the wallet modal. darkTheme() sets sensible defaults; we
 * override the subset that forge-editorial cares about so the modal reads
 * as the same visual system as the rest of forja.fun.
 *
 * Font cannot be overridden via the API (only 'system' / 'rounded' allowed),
 * so Instrument Serif is injected via the [data-rk] CSS block in globals.css.
 */
const base = darkTheme({
	accentColor: "#f0d38a",
	accentColorForeground: "#1a1307",
	borderRadius: "large",
	fontStack: "system",
});

const rainbowTheme = {
	...base,
	colors: {
		...base.colors,
		// Modal container
		modalBackground: "#141218",
		modalBorder: "rgba(255,255,255,0.09)",
		modalBackdrop: "rgba(6,5,9,0.78)",
		// Typography
		modalText: "#f5f5f0",
		modalTextSecondary: "#a6a6a0",
		modalTextDim: "#666663",
		// Wallet / menu items
		menuItemBackground: "rgba(255,255,255,0.035)",
		generalBorder: "rgba(255,255,255,0.09)",
		generalBorderDim: "rgba(255,255,255,0.05)",
		// Close button
		closeButton: "#a6a6a0",
		closeButtonBackground: "rgba(255,255,255,0.05)",
		// Primary/secondary actions inside the modal
		actionButtonBorder: "rgba(255,255,255,0.09)",
		actionButtonBorderMobile: "rgba(255,255,255,0.09)",
		actionButtonSecondaryBackground: "rgba(255,255,255,0.03)",
		// Shell
		connectButtonBackground: "#141218",
		connectButtonInnerBackground: "#1c1c26",
		connectButtonText: "#f5f5f0",
		connectButtonTextError: "#f87171",
		// Profile / connected states
		profileAction: "rgba(255,255,255,0.035)",
		profileActionHover: "rgba(240,211,138,0.1)",
		profileForeground: "#141218",
		// Error/warning
		error: "#f87171",
		standby: "#f0d38a",
		downloadBottomCardBackground:
			"linear-gradient(135deg, rgba(240,211,138,0.12), rgba(240,211,138,0.03))",
		downloadTopCardBackground: "rgba(255,255,255,0.04)",
	},
};

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
