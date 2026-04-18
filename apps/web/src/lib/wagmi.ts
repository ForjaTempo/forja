import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import type { Config } from "wagmi";
import { tempo, tempoModerato } from "wagmi/chains";
import { APP_NAME } from "./constants";

// WalletConnect requires a non-empty projectId.
// In production we fail-fast so an invalid placeholder can't ship to clients.
// In dev we keep an all-zero placeholder (with a warning) so local builds don't crash.
if (!process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID && process.env.NODE_ENV === "production") {
	throw new Error("NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID must be set in production builds");
}

if (!process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID) {
	console.warn(
		"[wagmi] NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID missing — using dev placeholder. Set it for production.",
	);
}

const walletConnectProjectId =
	process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "00000000000000000000000000000000";

export const config: Config = getDefaultConfig({
	appName: APP_NAME,
	projectId: walletConnectProjectId,
	chains: [tempo, tempoModerato],
	ssr: true,
});
