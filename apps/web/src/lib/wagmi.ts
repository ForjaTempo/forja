import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import type { Config } from "wagmi";
import { tempo, tempoModerato } from "wagmi/chains";
import { APP_NAME } from "./constants";

// WalletConnect requires a non-empty projectId. During CI builds the env var
// may be absent — use a placeholder so the build doesn't crash.  At runtime the
// real value from .env.local / server env takes effect.
const walletConnectProjectId =
	process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "00000000000000000000000000000000";

export const config: Config = getDefaultConfig({
	appName: APP_NAME,
	projectId: walletConnectProjectId,
	chains: [tempo, tempoModerato],
	ssr: true,
});
