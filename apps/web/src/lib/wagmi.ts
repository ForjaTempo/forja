import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import type { Config } from "wagmi";
import { tempo, tempoModerato } from "wagmi/chains";
import { APP_NAME } from "./constants";

export const config: Config = getDefaultConfig({
	appName: APP_NAME,
	projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "05d257e0e0177e2a316aa85bc35d7ef2",
	chains: [tempo, tempoModerato],
	ssr: true,
});
