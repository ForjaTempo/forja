import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import type { Config } from "wagmi";
import { tempo, tempoModerato } from "wagmi/chains";
import { APP_NAME } from "./constants";

// WalletConnect requires a non-empty projectId. Next inlines NEXT_PUBLIC_*
// vars at build time, so the value here reflects what was set when the
// bundle was built — not runtime env. Warn in dev, and log (not throw) in
// prod so a misconfigured build surfaces in the browser console without
// blocking unrelated routes from rendering.
const walletConnectProjectId =
	process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "00000000000000000000000000000000";

if (walletConnectProjectId === "00000000000000000000000000000000") {
	const msg =
		"[wagmi] NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID missing — using placeholder. Wallet connections will fail until this is set at build time.";
	if (process.env.NODE_ENV === "production") {
		console.error(msg);
	} else {
		console.warn(msg);
	}
}

/**
 * Tempo uses USDC as its native gas token (not ETH). wagmi/chains ships
 * a nativeCurrency for Tempo, but some wallet providers fall back to 18
 * decimals when the metadata is read loosely — which causes balance reads
 * to format as "NaN USD" in the RainbowKit account modal. We force the
 * correct { symbol: "USDC", decimals: 6 } shape here so downstream
 * useBalance calls always parse cleanly.
 */
const tempoMainnet = {
	...tempo,
	nativeCurrency: { name: "USD Coin", symbol: "USDC", decimals: 6 },
} as const;

const tempoTestnet = {
	...tempoModerato,
	nativeCurrency: { name: "USD Coin", symbol: "USDC", decimals: 6 },
} as const;

export const config: Config = getDefaultConfig({
	appName: APP_NAME,
	projectId: walletConnectProjectId,
	chains: [tempoMainnet, tempoTestnet],
	ssr: true,
});
