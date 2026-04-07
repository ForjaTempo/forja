import {
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
