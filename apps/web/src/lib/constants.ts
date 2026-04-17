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
export const FORJA_LAUNCHPAD_ADDRESS = (process.env.NEXT_PUBLIC_FORJA_LAUNCHPAD ??
	"0x") as `0x${string}`;
export const hasLaunchpad =
	FORJA_LAUNCHPAD_ADDRESS !== "0x" && process.env.NEXT_PUBLIC_LAUNCHPAD_ENABLED === "true";

export const FORJA_SWAP_ROUTER_ADDRESS = (process.env.NEXT_PUBLIC_FORJA_SWAP_ROUTER ??
	"0x") as `0x${string}`;
export const hasSwap =
	FORJA_SWAP_ROUTER_ADDRESS !== "0x" && process.env.NEXT_PUBLIC_SWAP_ENABLED === "true";

// Tempo Uniswap v4 + Permit2 (used by ForjaSwapRouter and the off-chain quoter)
export const POOL_MANAGER_ADDRESS = "0x33620f62c5b9b2086dd6b62f4a297a9f30347029" as const;
export const PERMIT2_ADDRESS = "0x000000000022D473030F116dDEE9F6B43aC78BA3" as const;
/** Protocol fee skimmed by ForjaSwapRouter, in basis points (10000 = 100%). */
export const SWAP_FEE_BPS = 25;

export const TIP20_DECIMALS = 6;

export const FEES = {
	tokenCreate: 2,
	multisend: 0.5,
	tokenLock: 1,
	batchLock: 1,
	claimCampaign: 1,
	launchCreate: 2,
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
export const APP_DESCRIPTION =
	"Create, send, lock, claim, and launch tokens on Tempo blockchain — the all-in-one token platform.";
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
