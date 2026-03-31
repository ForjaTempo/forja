import {
	FORJA_LOCKER_ADDRESS,
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
