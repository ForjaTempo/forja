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

/**
 * Tempo stablecoins. Stablecoin↔stablecoin swaps on Tempo settle via the
 * native DEX precompile at `0xDEc0…`; v2 of ForjaSwapRouter routes these
 * through the precompile and skims the same 0.25% fee as the v4 path.
 *
 * Source: tokenlist.tempo.xyz/list/4217 (stablecoin group).
 */
export const TEMPO_STABLECOINS = new Set<string>([
	"0x20c0000000000000000000000000000000000000", // PathUSD (USDC)
	"0x20c000000000000000000000b9537d11c60e8b50", // USDC.e (Bridged USDC)
	"0x20c00000000000000000000014f22ca97301eb73", // USDT0
	"0x20c0000000000000000000003554d28269e0f3c2", // frxUSD
	"0x20c0000000000000000000000520792dcccccccc", // cUSD (Cap USD)
	"0x20c0000000000000000000008ee4fcff88888888", // stcUSD
	"0x20c0000000000000000000005c0bac7cef389a11", // GUSD
	"0x20c0000000000000000000007f7ba549dd0251b9", // rUSD
	"0x20c000000000000000000000aeed2ec36a54d0e5", // wsrUSD
	"0x20c000000000000000000000383a23bacb546ab9", // reUSD
	"0x20c000000000000000000000ab02d39df30bd17e", // iUSD
	"0x20c000000000000000000000048c8f36df1c9a4a", // siUSD
	"0x20c0000000000000000000002f52d5cc21a3207b", // USDe
	"0x20c000000000000000000000bd95bfb69fbe6ce3", // sUSDe
]);

export function isStablecoinPair(tokenA: string, tokenB: string): boolean {
	return TEMPO_STABLECOINS.has(tokenA.toLowerCase()) && TEMPO_STABLECOINS.has(tokenB.toLowerCase());
}

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
export const FORJA_SWAP_ROUTER_MODERATO_ADDRESS = (process.env
	.NEXT_PUBLIC_FORJA_SWAP_ROUTER_MODERATO ?? "0x") as `0x${string}`;
export const hasSwap =
	FORJA_SWAP_ROUTER_ADDRESS !== "0x" && process.env.NEXT_PUBLIC_SWAP_ENABLED === "true";

/**
 * Per-chain router address. v2 is deployed on both Tempo mainnet and Moderato
 * testnet; returns `0x` for any unsupported chain so the UI can disable swaps.
 */
export function getSwapRouterAddress(chainId: number): `0x${string}` {
	if (chainId === TEMPO_CHAIN_ID) return FORJA_SWAP_ROUTER_ADDRESS;
	if (chainId === TEMPO_MODERATO_CHAIN_ID) return FORJA_SWAP_ROUTER_MODERATO_ADDRESS;
	return "0x";
}

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

export const APP_NAME = "Forja";
// Hero-synced tagline + explicit trust phrasing. Social cards should read
// the same voice as the landing page so first-impression is consistent.
export const APP_DESCRIPTION =
	"Forge tokens at the speed of payments. The non-custodial token toolkit for Tempo — create, send, lock, claim, launch, and trade. No seed phrase needed. All contracts verified on-chain.";
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
