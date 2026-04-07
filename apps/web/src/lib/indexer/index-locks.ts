import "server-only";
import { type getDb, schema } from "@forja/db";
import { and, eq } from "drizzle-orm";
import type { PublicClient } from "viem";
import { parseAbiItem } from "viem";
import { FORJA_LOCKER_ADDRESS, FORJA_LOCKER_V2_ADDRESS } from "../constants";
import { fetchBlockTimestamps } from "./utils";

const lockerAddresses = [
	FORJA_LOCKER_ADDRESS,
	...(FORJA_LOCKER_V2_ADDRESS !== "0x" ? [FORJA_LOCKER_V2_ADDRESS] : []),
] as const;

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

async function readOnChainLock(
	client: PublicClient,
	contractAddress: `0x${string}`,
	lockId: bigint,
) {
	return client.readContract({
		address: contractAddress,
		abi: lockerViewAbi,
		functionName: "locks",
		args: [lockId],
	});
}

/** Max concurrent RPC reads to avoid overwhelming the node. */
const RPC_BATCH_SIZE = 10;

interface LockEntry {
	lockId: bigint;
	contractAddress: `0x${string}`;
}

/** Batch-read multiple locks with bounded concurrency. */
async function readOnChainLocks(
	client: PublicClient,
	entries: LockEntry[],
): Promise<Map<string, Awaited<ReturnType<typeof readOnChainLock>>>> {
	type OnChainLock = Awaited<ReturnType<typeof readOnChainLock>>;
	const map = new Map<string, OnChainLock>();

	for (let i = 0; i < entries.length; i += RPC_BATCH_SIZE) {
		const batch = entries.slice(i, i + RPC_BATCH_SIZE);
		const results = await Promise.all(
			batch.map((e) => readOnChainLock(client, e.contractAddress, e.lockId)),
		);
		batch.forEach((e, j) => {
			map.set(`${e.contractAddress}:${e.lockId}`, results[j] as OnChainLock);
		});
	}

	return map;
}

/** Helper to build WHERE clause matching (contractAddress, lockId) composite. */
function lockWhere(contractAddr: string, lockId: number) {
	return and(
		eq(schema.locks.contractAddress, contractAddr.toLowerCase()),
		eq(schema.locks.lockId, lockId),
	);
}

export async function indexLockEvents(
	db: ReturnType<typeof getDb>,
	client: PublicClient,
	fromBlock: bigint,
	toBlock: bigint,
) {
	let count = 0;

	// Fetch all event types from all locker contracts in parallel (typed separately)
	const createPromises = lockerAddresses.map((addr) =>
		client.getLogs({ address: addr, event: lockCreatedEvent, fromBlock, toBlock }),
	);
	const claimPromises = lockerAddresses.map((addr) =>
		client.getLogs({ address: addr, event: tokensClaimedEvent, fromBlock, toBlock }),
	);
	const revokePromises = lockerAddresses.map((addr) =>
		client.getLogs({ address: addr, event: lockRevokedEvent, fromBlock, toBlock }),
	);

	const [createResults, claimResults, revokeResults] = await Promise.all([
		Promise.all(createPromises),
		Promise.all(claimPromises),
		Promise.all(revokePromises),
	]);

	const createLogs = createResults.flat();
	const claimLogs = claimResults.flat();
	const revokeLogs = revokeResults.flat();

	const totalLogs = createLogs.length + claimLogs.length + revokeLogs.length;
	if (totalLogs === 0) return 0;

	// Fetch block timestamps for all events
	const blockTimestamps = await fetchBlockTimestamps(client, [
		...createLogs.map((l) => l.blockNumber),
		...claimLogs.map((l) => l.blockNumber),
		...revokeLogs.map((l) => l.blockNumber),
	]);

	// Collect all unique lockId+address entries for batch RPC read
	const allEntries: LockEntry[] = [];
	const entrySeen = new Set<string>();

	function addEntry(lockId: bigint, contractAddress: `0x${string}`) {
		const key = `${contractAddress}:${lockId}`;
		if (!entrySeen.has(key)) {
			entrySeen.add(key);
			allEntries.push({ lockId, contractAddress });
		}
	}

	for (const log of createLogs) {
		addEntry(log.args.lockId ?? 0n, log.address as `0x${string}`);
	}
	for (const log of claimLogs) {
		addEntry(log.args.lockId ?? 0n, log.address as `0x${string}`);
	}
	for (const log of revokeLogs) {
		addEntry(log.args.lockId ?? 0n, log.address as `0x${string}`);
	}

	// Batch-read all lock states from chain in parallel
	const onChainStates = await readOnChainLocks(client, allEntries);

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
		const contractAddr = (log.address as string).toLowerCase();
		const blockTs = blockTimestamps.get(log.blockNumber) ?? new Date();

		// Insert from event data (idempotent via composite unique)
		await db
			.insert(schema.locks)
			.values({
				lockId,
				contractAddress: contractAddr,
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
			.onConflictDoNothing({
				target: [schema.locks.contractAddress, schema.locks.lockId],
			});

		// Use batch-fetched on-chain state for fields missing from event
		const onChain = onChainStates.get(`${log.address}:${rawLockId ?? 0n}`);
		if (onChain) {
			const [, , , , claimedAmount, , , cliffDuration, , revocable, revoked] = onChain;
			await db
				.update(schema.locks)
				.set({
					cliffDuration: Number(cliffDuration),
					revocable,
					claimedAmount: claimedAmount.toString(),
					revoked,
					updatedAt: new Date(),
				})
				.where(lockWhere(contractAddr, lockId));
		}

		count++;
	}

	// Process TokensClaimed events
	for (const log of claimLogs) {
		const { lockId: rawLockId, beneficiary, amount } = log.args;
		const lockId = Number(rawLockId ?? 0n);
		const contractAddr = (log.address as string).toLowerCase();
		const blockTs = blockTimestamps.get(log.blockNumber) ?? new Date();

		// Insert claim row (idempotent via onConflictDoNothing on txHash)
		await db
			.insert(schema.claims)
			.values({
				lockId,
				contractAddress: contractAddr,
				beneficiaryAddress: (beneficiary ?? "").toLowerCase(),
				amount: (amount ?? 0n).toString(),
				txHash: log.transactionHash ?? "",
				blockNumber: Number(log.blockNumber),
				createdAt: blockTs,
			})
			.onConflictDoNothing({ target: schema.claims.txHash });

		// Overwrite claimedAmount from on-chain state (idempotent — no increment)
		const onChain = onChainStates.get(`${log.address}:${rawLockId ?? 0n}`);
		if (onChain) {
			const [, , , , claimedAmount] = onChain;
			await db
				.update(schema.locks)
				.set({
					claimedAmount: claimedAmount.toString(),
					updatedAt: new Date(),
				})
				.where(lockWhere(contractAddr, lockId));
		}

		count++;
	}

	// Process LockRevoked events
	for (const log of revokeLogs) {
		const lockId = Number(log.args.lockId ?? 0n);
		const contractAddr = (log.address as string).toLowerCase();

		// Use batch-fetched on-chain state for final claimedAmount
		const onChain = onChainStates.get(`${log.address}:${log.args.lockId ?? 0n}`);
		if (onChain) {
			const [, , , , claimedAmount] = onChain;
			await db
				.update(schema.locks)
				.set({
					revoked: true,
					claimedAmount: claimedAmount.toString(),
					updatedAt: new Date(),
				})
				.where(lockWhere(contractAddr, lockId));
		}

		count++;
	}

	return count;
}
