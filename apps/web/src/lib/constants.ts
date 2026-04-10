export const TEMPO_CHAIN_ID = 4217;
export const TEMPO_MODERATO_CHAIN_ID = 42431;
export const TEMPO_RPC = "https://rpc.tempo.xyz";

export const SUPPORTED_CHAIN_IDS = new Set([TEMPO_CHAIN_ID, TEMPO_MODERATO_CHAIN_ID]);

const EXPLORER_URLS: Record<number, string> = {
	[TEMPO_CHAIN_ID]: "https://explore.tempo.xyz",
	[TEMPO_MODERATO_CHAIN_ID]: "https://explore.moderato.tempo.xyz",
};

export function getExplorerUrl(chainId: number): string {
	return EXPLORER_URLS[chainId] ?? "https://explore.tempo.xyz";
}

export const PATHUSDC_ADDRESS = "0x20C0000000000000000000000000000000000000" as const;
export const TIP20_FACTORY_ADDRESS = "0x20Fc000000000000000000000000000000000000" as const;

// FORJA contract addresses (set after deployment via env vars)
export const FORJA_TOKEN_FACTORY_ADDRESS = (process.env.NEXT_PUBLIC_FORJA_TOKEN_FACTORY ??
	"0x") as `0x${string}`;
export const FORJA_MULTISEND_ADDRESS = (process.env.NEXT_PUBLIC_FORJA_MULTISEND ??
	"0x") as `0x${string}`;
export const FORJA_LOCKER_ADDRESS = (process.env.NEXT_PUBLIC_FORJA_LOCKER ?? "0x") as `0x${string}`;
export const FORJA_LOCKER_V2_ADDRESS = (process.env.NEXT_PUBLIC_FORJA_LOCKER_V2 ??
	"0x") as `0x${string}`;
export const FORJA_CLAIMER_ADDRESS = (process.env.NEXT_PUBLIC_FORJA_CLAIMER ??
	"0x") as `0x${string}`;

export const TIP20_DECIMALS = 6;

export const FEES = {
	tokenCreate: 2,
	multisend: 0.5,
	tokenLock: 1,
	batchLock: 1,
	claimCampaign: 1,
} as const;

// Phase 12A: Merkle Claim Pages safety limits
export const MAX_ACTIVE_CAMPAIGNS_PER_WALLET = 5;
export const MAX_BATCH_CLAIMS = 50;
export const CLAIM_CAP_USD = Number(process.env.CLAIM_CAP_USD ?? "1000");
// Set this to ForjaClaimer mainnet deploy timestamp (unix seconds) to enable canary cap window.
// 0 disables the canary check.
export const CLAIMER_DEPLOY_TIMESTAMP = Number(process.env.CLAIMER_DEPLOY_TIMESTAMP ?? "0");
export const CANARY_WINDOW_SECONDS = 7 * 24 * 60 * 60;

export const APP_NAME = "FORJA";
export const APP_DESCRIPTION = "Token toolkit for Tempo blockchain";
export const APP_URL = "https://forja.fun";

if (typeof window === "undefined") {
	const missing: string[] = [];
	if (FORJA_TOKEN_FACTORY_ADDRESS === "0x") missing.push("NEXT_PUBLIC_FORJA_TOKEN_FACTORY");
	if (FORJA_MULTISEND_ADDRESS === "0x") missing.push("NEXT_PUBLIC_FORJA_MULTISEND");
	if (FORJA_LOCKER_ADDRESS === "0x") missing.push("NEXT_PUBLIC_FORJA_LOCKER");
	if (FORJA_LOCKER_V2_ADDRESS === "0x") missing.push("NEXT_PUBLIC_FORJA_LOCKER_V2");
	if (FORJA_CLAIMER_ADDRESS === "0x") missing.push("NEXT_PUBLIC_FORJA_CLAIMER");
	if (missing.length > 0) {
		console.warn(`[config] Missing env vars: ${missing.join(", ")}`);
	}

	if (!process.env.NEXT_PUBLIC_OPENPANEL_CLIENT_ID) {
		console.warn("[config] Missing NEXT_PUBLIC_OPENPANEL_CLIENT_ID — analytics disabled");
	}
}
