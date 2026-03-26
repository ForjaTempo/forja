export const TEMPO_CHAIN_ID = 4217;
export const TEMPO_RPC = "https://rpc.tempo.xyz";
export const TEMPO_EXPLORER = "https://explore.tempo.xyz";

export const PATHUSDC_ADDRESS = "0x20C0000000000000000000000000000000000000" as const;
export const TIP20_FACTORY_ADDRESS = "0x20Fc000000000000000000000000000000000000" as const;

// FORJA contract addresses (set after deployment via env vars)
export const FORJA_TOKEN_FACTORY_ADDRESS = (process.env.NEXT_PUBLIC_FORJA_TOKEN_FACTORY ??
	"0x") as `0x${string}`;
export const FORJA_MULTISEND_ADDRESS = (process.env.NEXT_PUBLIC_FORJA_MULTISEND ??
	"0x") as `0x${string}`;
export const FORJA_LOCKER_ADDRESS = (process.env.NEXT_PUBLIC_FORJA_LOCKER ?? "0x") as `0x${string}`;

export const TIP20_DECIMALS = 6;

export const FEES = {
	tokenCreate: 20,
	multisend: 3,
	tokenLock: 10,
} as const;

export const APP_NAME = "FORJA";
export const APP_DESCRIPTION = "Token toolkit for Tempo blockchain";
export const APP_URL = "https://forja.fun";
