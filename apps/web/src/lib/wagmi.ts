import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import type { Config } from "wagmi";
import { tempo, tempoModerato } from "wagmi/chains";
import { APP_NAME } from "./constants";

export const config: Config = getDefaultConfig({
	appName: APP_NAME,
	projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "",
	chains: [tempo, tempoModerato],
	ssr: true,
});
