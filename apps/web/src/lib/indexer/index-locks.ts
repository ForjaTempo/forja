import "server-only";
import { type getDb, schema } from "@forja/db";
import { eq } from "drizzle-orm";
import type { PublicClient } from "viem";
import { parseAbiItem } from "viem";
import { FORJA_LOCKER_ADDRESS } from "../constants";
import { fetchBlockTimestamps } from "./utils";

const lockCreatedEvent = parseAbiItem(
	"event LockCreated(uint256 indexed lockId, address indexed creator, address indexed token, address beneficiary, uint256 amount, uint64 startTime, uint64 endTime, bool vestingEnabled)",
);

const tokensClaimedEvent = parseAbiItem(
	"event TokensClaimed(uint256 indexed lockId, address indexed beneficiary, uint256 amount)",
);

const lockRevokedEvent = parseAbiItem(
	"event LockRevoked(uint256 indexed lockId, uint256 returnedAmount)",
);

// View function ABI for reading full on-chain lock state
const lockerViewAbi = [
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
] as const;

async function readOnChainLock(client: PublicClient, lockId: bigint) {
	return client.readContract({
		address: FORJA_LOCKER_ADDRESS,
		abi: lockerViewAbi,
		functionName: "locks",
		args: [lockId],
	});
}

export async function indexLockEvents(
	db: ReturnType<typeof getDb>,
	client: PublicClient,
	fromBlock: bigint,
	toBlock: bigint,
) {
	let count = 0;

	// Fetch all event types in parallel
	const [createLogs, claimLogs, revokeLogs] = await Promise.all([
		client.getLogs({
			address: FORJA_LOCKER_ADDRESS,
			event: lockCreatedEvent,
			fromBlock,
			toBlock,
		}),
		client.getLogs({
			address: FORJA_LOCKER_ADDRESS,
			event: tokensClaimedEvent,
			fromBlock,
			toBlock,
		}),
		client.getLogs({
			address: FORJA_LOCKER_ADDRESS,
			event: lockRevokedEvent,
			fromBlock,
			toBlock,
		}),
	]);

	const totalLogs = createLogs.length + claimLogs.length + revokeLogs.length;
	if (totalLogs === 0) return 0;

	// Fetch block timestamps for all events
	const blockTimestamps = await fetchBlockTimestamps(client, [
		...createLogs.map((l) => l.blockNumber),
		...claimLogs.map((l) => l.blockNumber),
		...revokeLogs.map((l) => l.blockNumber),
	]);

	// Process LockCreated events
	for (const log of createLogs) {
		const {
			lockId: rawLockId,
			creator,
			token,
			beneficiary,
			amount,
			startTime,
			endTime,
			vestingEnabled,
		} = log.args;
		const lockId = Number(rawLockId ?? 0n);
		const blockTs = blockTimestamps.get(log.blockNumber) ?? new Date();

		// Insert from event data (idempotent via onConflictDoNothing)
		await db
			.insert(schema.locks)
			.values({
				lockId,
				tokenAddress: (token ?? "").toLowerCase(),
				creatorAddress: (creator ?? "").toLowerCase(),
				beneficiaryAddress: (beneficiary ?? "").toLowerCase(),
				totalAmount: (amount ?? 0n).toString(),
				startTime: new Date(Number(startTime ?? 0n) * 1000),
				endTime: new Date(Number(endTime ?? 0n) * 1000),
				vestingEnabled: vestingEnabled ?? false,
				txHash: log.transactionHash ?? "",
				blockNumber: Number(log.blockNumber),
				createdAt: blockTs,
			})
			.onConflictDoNothing({ target: schema.locks.lockId });

		// Read on-chain state for fields missing from event (cliffDuration, revocable)
		// and always-correct fields (claimedAmount, revoked)
		const onChain = await readOnChainLock(client, BigInt(lockId));
		await db
			.update(schema.locks)
			.set({
				cliffDuration: Number(onChain[7]),
				revocable: onChain[9],
				claimedAmount: onChain[4].toString(),
				revoked: onChain[10],
				updatedAt: new Date(),
			})
			.where(eq(schema.locks.lockId, lockId));

		count++;
	}

	// Process TokensClaimed events
	for (const log of claimLogs) {
		const { lockId: rawLockId, beneficiary, amount } = log.args;
		const lockId = Number(rawLockId ?? 0n);
		const blockTs = blockTimestamps.get(log.blockNumber) ?? new Date();

		// Insert claim row (idempotent via onConflictDoNothing on txHash)
		await db
			.insert(schema.claims)
			.values({
				lockId,
				beneficiaryAddress: (beneficiary ?? "").toLowerCase(),
				amount: (amount ?? 0n).toString(),
				txHash: log.transactionHash ?? "",
				blockNumber: Number(log.blockNumber),
				createdAt: blockTs,
			})
			.onConflictDoNothing({ target: schema.claims.txHash });

		// Overwrite claimedAmount from on-chain state (idempotent — no increment)
		const onChain = await readOnChainLock(client, BigInt(lockId));
		await db
			.update(schema.locks)
			.set({
				claimedAmount: onChain[4].toString(),
				updatedAt: new Date(),
			})
			.where(eq(schema.locks.lockId, lockId));

		count++;
	}

	// Process LockRevoked events
	for (const log of revokeLogs) {
		const lockId = Number(log.args.lockId ?? 0n);

		// Read on-chain state for final claimedAmount (revoke can trigger a claim)
		const onChain = await readOnChainLock(client, BigInt(lockId));
		await db
			.update(schema.locks)
			.set({
				revoked: true,
				claimedAmount: onChain[4].toString(),
				updatedAt: new Date(),
			})
			.where(eq(schema.locks.lockId, lockId));

		count++;
	}

	return count;
}
