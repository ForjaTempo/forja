import {
	FORJA_CLAIMER_ADDRESS,
	FORJA_LOCKER_ADDRESS,
	FORJA_LOCKER_V2_ADDRESS,
	FORJA_MULTISEND_ADDRESS,
	FORJA_TOKEN_FACTORY_ADDRESS,
	PATHUSDC_ADDRESS,
} from "./constants";

export const pathusdcConfig = {
	address: PATHUSDC_ADDRESS,
	abi: [
		{
			name: "approve",
			type: "function",
			stateMutability: "nonpayable",
			inputs: [
				{ name: "spender", type: "address" },
				{ name: "amount", type: "uint256" },
			],
			outputs: [{ name: "", type: "bool" }],
		},
		{
			name: "allowance",
			type: "function",
			stateMutability: "view",
			inputs: [
				{ name: "owner", type: "address" },
				{ name: "spender", type: "address" },
			],
			outputs: [{ name: "", type: "uint256" }],
		},
		{
			name: "balanceOf",
			type: "function",
			stateMutability: "view",
			inputs: [{ name: "account", type: "address" }],
			outputs: [{ name: "", type: "uint256" }],
		},
	],
} as const;

export const tokenFactoryConfig = {
	address: FORJA_TOKEN_FACTORY_ADDRESS,
	abi: [
		{
			name: "createToken",
			type: "function",
			stateMutability: "nonpayable",
			inputs: [
				{ name: "name", type: "string" },
				{ name: "symbol", type: "string" },
				{ name: "initialSupply", type: "uint256" },
			],
			outputs: [{ name: "", type: "address" }],
		},
		{
			name: "createFee",
			type: "function",
			stateMutability: "view",
			inputs: [],
			outputs: [{ name: "", type: "uint256" }],
		},
		{
			type: "event",
			name: "TokenCreated",
			inputs: [
				{ name: "creator", type: "address", indexed: true },
				{ name: "token", type: "address", indexed: true },
				{ name: "name", type: "string", indexed: false },
				{ name: "symbol", type: "string", indexed: false },
				{ name: "initialSupply", type: "uint256", indexed: false },
			],
		},
		{
			name: "userNonce",
			type: "function",
			stateMutability: "view",
			inputs: [{ name: "", type: "address" }],
			outputs: [{ name: "", type: "uint256" }],
		},
		{
			name: "pathUsd",
			type: "function",
			stateMutability: "view",
			inputs: [],
			outputs: [{ name: "", type: "address" }],
		},
	],
} as const;

export const multisendConfig = {
	address: FORJA_MULTISEND_ADDRESS,
	abi: [
		{
			name: "multisendToken",
			type: "function",
			stateMutability: "nonpayable",
			inputs: [
				{ name: "token", type: "address" },
				{ name: "recipients", type: "address[]" },
				{ name: "amounts", type: "uint256[]" },
			],
			outputs: [],
		},
		{
			name: "multisendFee",
			type: "function",
			stateMutability: "view",
			inputs: [],
			outputs: [{ name: "", type: "uint256" }],
		},
		{
			name: "MAX_RECIPIENTS",
			type: "function",
			stateMutability: "view",
			inputs: [],
			outputs: [{ name: "", type: "uint256" }],
		},
		{
			type: "event",
			name: "MultisendExecuted",
			inputs: [
				{ name: "sender", type: "address", indexed: true },
				{ name: "token", type: "address", indexed: true },
				{ name: "recipientCount", type: "uint256", indexed: false },
				{ name: "totalAmount", type: "uint256", indexed: false },
			],
		},
	],
} as const;

export const erc20Abi = [
	{
		name: "name",
		type: "function",
		stateMutability: "view",
		inputs: [],
		outputs: [{ name: "", type: "string" }],
	},
	{
		name: "symbol",
		type: "function",
		stateMutability: "view",
		inputs: [],
		outputs: [{ name: "", type: "string" }],
	},
	{
		name: "decimals",
		type: "function",
		stateMutability: "view",
		inputs: [],
		outputs: [{ name: "", type: "uint8" }],
	},
	{
		name: "balanceOf",
		type: "function",
		stateMutability: "view",
		inputs: [{ name: "account", type: "address" }],
		outputs: [{ name: "", type: "uint256" }],
	},
	{
		name: "allowance",
		type: "function",
		stateMutability: "view",
		inputs: [
			{ name: "owner", type: "address" },
			{ name: "spender", type: "address" },
		],
		outputs: [{ name: "", type: "uint256" }],
	},
	{
		name: "approve",
		type: "function",
		stateMutability: "nonpayable",
		inputs: [
			{ name: "spender", type: "address" },
			{ name: "amount", type: "uint256" },
		],
		outputs: [{ name: "", type: "bool" }],
	},
] as const;

export const lockerConfig = {
	address: FORJA_LOCKER_ADDRESS,
	abi: [
		{
			type: "event",
			name: "LockCreated",
			inputs: [
				{ name: "lockId", type: "uint256", indexed: true },
				{ name: "creator", type: "address", indexed: true },
				{ name: "token", type: "address", indexed: true },
				{ name: "beneficiary", type: "address", indexed: false },
				{ name: "amount", type: "uint256", indexed: false },
				{ name: "startTime", type: "uint64", indexed: false },
				{ name: "endTime", type: "uint64", indexed: false },
				{ name: "vestingEnabled", type: "bool", indexed: false },
			],
		},
		{
			type: "event",
			name: "TokensClaimed",
			inputs: [
				{ name: "lockId", type: "uint256", indexed: true },
				{ name: "beneficiary", type: "address", indexed: true },
				{ name: "amount", type: "uint256", indexed: false },
			],
		},
		{
			type: "event",
			name: "LockRevoked",
			inputs: [
				{ name: "lockId", type: "uint256", indexed: true },
				{ name: "returnedAmount", type: "uint256", indexed: false },
			],
		},
		{
			name: "createLock",
			type: "function",
			stateMutability: "nonpayable",
			inputs: [
				{ name: "token", type: "address" },
				{ name: "beneficiary", type: "address" },
				{ name: "amount", type: "uint256" },
				{ name: "lockDuration", type: "uint64" },
				{ name: "cliffDuration", type: "uint64" },
				{ name: "vestingEnabled", type: "bool" },
				{ name: "revocable", type: "bool" },
			],
			outputs: [{ name: "", type: "uint256" }],
		},
		{
			name: "claim",
			type: "function",
			stateMutability: "nonpayable",
			inputs: [{ name: "lockId", type: "uint256" }],
			outputs: [],
		},
		{
			name: "revokeLock",
			type: "function",
			stateMutability: "nonpayable",
			inputs: [{ name: "lockId", type: "uint256" }],
			outputs: [],
		},
		{
			name: "getClaimableAmount",
			type: "function",
			stateMutability: "view",
			inputs: [{ name: "lockId", type: "uint256" }],
			outputs: [{ name: "", type: "uint256" }],
		},
		{
			name: "getLocksByCreator",
			type: "function",
			stateMutability: "view",
			inputs: [{ name: "creator", type: "address" }],
			outputs: [{ name: "", type: "uint256[]" }],
		},
		{
			name: "getLocksByBeneficiary",
			type: "function",
			stateMutability: "view",
			inputs: [{ name: "beneficiary", type: "address" }],
			outputs: [{ name: "", type: "uint256[]" }],
		},
		{
			name: "locks",
			type: "function",
			stateMutability: "view",
			inputs: [{ name: "", type: "uint256" }],
			outputs: [
				{ name: "token", type: "address" },
				{ name: "creator", type: "address" },
				{ name: "beneficiary", type: "address" },
				{ name: "totalAmount", type: "uint256" },
				{ name: "claimedAmount", type: "uint256" },
				{ name: "startTime", type: "uint64" },
				{ name: "endTime", type: "uint64" },
				{ name: "cliffDuration", type: "uint64" },
				{ name: "vestingEnabled", type: "bool" },
				{ name: "revocable", type: "bool" },
				{ name: "revoked", type: "bool" },
			],
		},
		{
			name: "lockFee",
			type: "function",
			stateMutability: "view",
			inputs: [],
			outputs: [{ name: "", type: "uint256" }],
		},
		{
			name: "nextLockId",
			type: "function",
			stateMutability: "view",
			inputs: [],
			outputs: [{ name: "", type: "uint256" }],
		},
	],
} as const;

export const lockerV2Config = {
	address: FORJA_LOCKER_V2_ADDRESS,
	abi: [
		...lockerConfig.abi,
		{
			name: "createBatchLock",
			type: "function",
			stateMutability: "nonpayable",
			inputs: [
				{ name: "token", type: "address" },
				{ name: "beneficiaries", type: "address[]" },
				{ name: "amounts", type: "uint256[]" },
				{ name: "lockDuration", type: "uint64" },
				{ name: "cliffDuration", type: "uint64" },
				{ name: "vestingEnabled", type: "bool" },
				{ name: "revocable", type: "bool" },
			],
			outputs: [{ name: "", type: "uint256[]" }],
		},
		{
			type: "event",
			name: "BatchLockCreated",
			inputs: [
				{ name: "batchId", type: "uint256", indexed: true },
				{ name: "creator", type: "address", indexed: true },
				{ name: "token", type: "address", indexed: true },
				{ name: "lockIds", type: "uint256[]", indexed: false },
				{ name: "totalAmount", type: "uint256", indexed: false },
			],
		},
		{
			name: "MAX_BATCH_SIZE",
			type: "function",
			stateMutability: "view",
			inputs: [],
			outputs: [{ name: "", type: "uint256" }],
		},
	],
} as const;

/**
 * True when ForjaLockerV2 is configured. Single-lock create/read flows fall back
 * to V1 when V2 is absent; batch-lock UI is gated behind this flag entirely.
 */
export const hasLockerV2 = FORJA_LOCKER_V2_ADDRESS !== "0x";

/**
 * The locker contract that new single-lock writes (create/fee) target.
 * - V2 when NEXT_PUBLIC_FORJA_LOCKER_V2 is set
 * - V1 otherwise (safe fallback so the lock page keeps working without V2 env)
 *
 * Uses the V1 ABI subset — both contracts share identical createLock/claim/revoke/locks/lockFee signatures.
 */
export const activeLockerConfig = {
	address: (hasLockerV2 ? FORJA_LOCKER_V2_ADDRESS : FORJA_LOCKER_ADDRESS) as `0x${string}`,
	abi: lockerConfig.abi,
} as const;

export const claimerConfig = {
	address: FORJA_CLAIMER_ADDRESS,
	abi: [
		{
			name: "createCampaign",
			type: "function",
			stateMutability: "nonpayable",
			inputs: [
				{ name: "token", type: "address" },
				{ name: "merkleRoot", type: "bytes32" },
				{ name: "totalDeposit", type: "uint256" },
				{ name: "startTime", type: "uint64" },
				{ name: "endTime", type: "uint64" },
				{ name: "sweepEnabled", type: "bool" },
			],
			outputs: [{ name: "campaignId", type: "uint256" }],
		},
		{
			name: "claim",
			type: "function",
			stateMutability: "nonpayable",
			inputs: [
				{ name: "campaignId", type: "uint256" },
				{ name: "amount", type: "uint256" },
				{ name: "proof", type: "bytes32[]" },
			],
			outputs: [],
		},
		{
			name: "claimMultiple",
			type: "function",
			stateMutability: "nonpayable",
			inputs: [
				{ name: "campaignIds", type: "uint256[]" },
				{ name: "amounts", type: "uint256[]" },
				{ name: "proofs", type: "bytes32[][]" },
			],
			outputs: [],
		},
		{
			name: "sweep",
			type: "function",
			stateMutability: "nonpayable",
			inputs: [{ name: "campaignId", type: "uint256" }],
			outputs: [],
		},
		{
			name: "claimFee",
			type: "function",
			stateMutability: "view",
			inputs: [],
			outputs: [{ name: "", type: "uint256" }],
		},
		{
			name: "nextCampaignId",
			type: "function",
			stateMutability: "view",
			inputs: [],
			outputs: [{ name: "", type: "uint256" }],
		},
		{
			name: "campaigns",
			type: "function",
			stateMutability: "view",
			inputs: [{ name: "", type: "uint256" }],
			outputs: [
				{ name: "creator", type: "address" },
				{ name: "token", type: "address" },
				{ name: "merkleRoot", type: "bytes32" },
				{ name: "totalDeposited", type: "uint256" },
				{ name: "totalClaimed", type: "uint256" },
				{ name: "startTime", type: "uint64" },
				{ name: "endTime", type: "uint64" },
				{ name: "sweepEnabled", type: "bool" },
				{ name: "swept", type: "bool" },
			],
		},
		{
			name: "isClaimed",
			type: "function",
			stateMutability: "view",
			inputs: [
				{ name: "campaignId", type: "uint256" },
				{ name: "recipient", type: "address" },
				{ name: "amount", type: "uint256" },
			],
			outputs: [{ name: "", type: "bool" }],
		},
		{
			name: "MAX_BATCH_CLAIMS",
			type: "function",
			stateMutability: "view",
			inputs: [],
			outputs: [{ name: "", type: "uint256" }],
		},
		{
			type: "event",
			name: "CampaignCreated",
			inputs: [
				{ name: "campaignId", type: "uint256", indexed: true },
				{ name: "creator", type: "address", indexed: true },
				{ name: "token", type: "address", indexed: true },
				{ name: "merkleRoot", type: "bytes32", indexed: false },
				{ name: "totalDeposited", type: "uint256", indexed: false },
				{ name: "startTime", type: "uint64", indexed: false },
				{ name: "endTime", type: "uint64", indexed: false },
				{ name: "sweepEnabled", type: "bool", indexed: false },
			],
		},
		{
			type: "event",
			name: "Claimed",
			inputs: [
				{ name: "campaignId", type: "uint256", indexed: true },
				{ name: "recipient", type: "address", indexed: true },
				{ name: "amount", type: "uint256", indexed: false },
				{ name: "leaf", type: "bytes32", indexed: false },
			],
		},
		{
			type: "event",
			name: "CampaignSwept",
			inputs: [
				{ name: "campaignId", type: "uint256", indexed: true },
				{ name: "creator", type: "address", indexed: true },
				{ name: "amount", type: "uint256", indexed: false },
			],
		},
	],
} as const;

export const hasClaimer = FORJA_CLAIMER_ADDRESS !== "0x";

// ─── Phase 14: Launchpad ───

import { FORJA_LAUNCHPAD_ADDRESS, hasLaunchpad } from "./constants";

export { hasLaunchpad };

export const launchpadConfig = {
	address: FORJA_LAUNCHPAD_ADDRESS,
	abi: [
		{
			name: "createLaunch",
			type: "function",
			stateMutability: "nonpayable",
			inputs: [
				{ name: "name", type: "string" },
				{ name: "symbol", type: "string" },
				{ name: "description", type: "string" },
				{ name: "imageUri", type: "string" },
			],
			outputs: [{ name: "launchId", type: "uint256" }],
		},
		{
			name: "buy",
			type: "function",
			stateMutability: "nonpayable",
			inputs: [
				{ name: "launchId", type: "uint256" },
				{ name: "usdcAmount", type: "uint256" },
				{ name: "minTokensOut", type: "uint256" },
			],
			outputs: [],
		},
		{
			name: "sell",
			type: "function",
			stateMutability: "nonpayable",
			inputs: [
				{ name: "launchId", type: "uint256" },
				{ name: "tokenAmount", type: "uint256" },
				{ name: "minUsdcOut", type: "uint256" },
			],
			outputs: [],
		},
		{
			name: "claimCreatorFee",
			type: "function",
			stateMutability: "nonpayable",
			inputs: [{ name: "launchId", type: "uint256" }],
			outputs: [],
		},
		{
			name: "getCurrentPrice",
			type: "function",
			stateMutability: "view",
			inputs: [{ name: "launchId", type: "uint256" }],
			outputs: [{ name: "", type: "uint256" }],
		},
		{
			name: "calculateBuyReturn",
			type: "function",
			stateMutability: "view",
			inputs: [
				{ name: "launchId", type: "uint256" },
				{ name: "usdcAmount", type: "uint256" },
			],
			outputs: [{ name: "tokensOut", type: "uint256" }],
		},
		{
			name: "calculateSellReturn",
			type: "function",
			stateMutability: "view",
			inputs: [
				{ name: "launchId", type: "uint256" },
				{ name: "tokenAmount", type: "uint256" },
			],
			outputs: [{ name: "usdcOut", type: "uint256" }],
		},
		{
			name: "launches",
			type: "function",
			stateMutability: "view",
			inputs: [{ name: "", type: "uint256" }],
			outputs: [
				{ name: "token", type: "address" },
				{ name: "creator", type: "address" },
				{ name: "virtualTokens", type: "uint256" },
				{ name: "virtualUsdc", type: "uint256" },
				{ name: "realTokensSold", type: "uint256" },
				{ name: "realUsdcRaised", type: "uint256" },
				{ name: "creatorFeeAccrued", type: "uint256" },
				{ name: "startTime", type: "uint256" },
				{ name: "graduated", type: "bool" },
				{ name: "killed", type: "bool" },
				{ name: "failed", type: "bool" },
			],
		},
		{
			name: "launchMeta",
			type: "function",
			stateMutability: "view",
			inputs: [{ name: "", type: "uint256" }],
			outputs: [
				{ name: "name", type: "string" },
				{ name: "symbol", type: "string" },
				{ name: "description", type: "string" },
				{ name: "imageUri", type: "string" },
			],
		},
		{
			name: "createFee",
			type: "function",
			stateMutability: "view",
			inputs: [],
			outputs: [{ name: "", type: "uint256" }],
		},
		{
			name: "nextLaunchId",
			type: "function",
			stateMutability: "view",
			inputs: [],
			outputs: [{ name: "", type: "uint256" }],
		},
		{
			name: "GRADUATION_THRESHOLD",
			type: "function",
			stateMutability: "view",
			inputs: [],
			outputs: [{ name: "", type: "uint256" }],
		},
		{
			name: "TOTAL_SUPPLY",
			type: "function",
			stateMutability: "view",
			inputs: [],
			outputs: [{ name: "", type: "uint256" }],
		},
		{
			type: "event",
			name: "LaunchCreated",
			inputs: [
				{ name: "launchId", type: "uint256", indexed: true },
				{ name: "creator", type: "address", indexed: true },
				{ name: "token", type: "address", indexed: true },
				{ name: "name", type: "string", indexed: false },
				{ name: "symbol", type: "string", indexed: false },
				{ name: "description", type: "string", indexed: false },
				{ name: "imageUri", type: "string", indexed: false },
			],
		},
		{
			type: "event",
			name: "TokenBought",
			inputs: [
				{ name: "launchId", type: "uint256", indexed: true },
				{ name: "buyer", type: "address", indexed: true },
				{ name: "usdcSpent", type: "uint256", indexed: false },
				{ name: "tokensReceived", type: "uint256", indexed: false },
				{ name: "newPrice", type: "uint256", indexed: false },
			],
		},
		{
			type: "event",
			name: "TokenSold",
			inputs: [
				{ name: "launchId", type: "uint256", indexed: true },
				{ name: "seller", type: "address", indexed: true },
				{ name: "tokensSold", type: "uint256", indexed: false },
				{ name: "usdcReceived", type: "uint256", indexed: false },
				{ name: "fee", type: "uint256", indexed: false },
				{ name: "newPrice", type: "uint256", indexed: false },
			],
		},
		{
			type: "event",
			name: "Graduated",
			inputs: [
				{ name: "launchId", type: "uint256", indexed: true },
				{ name: "token", type: "address", indexed: true },
				{ name: "usdcInPool", type: "uint256", indexed: false },
				{ name: "tokensInPool", type: "uint256", indexed: false },
			],
		},
	],
} as const;
