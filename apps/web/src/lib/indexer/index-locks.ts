import "server-only";
import { type getDb, schema } from "@forja/db";
import { eq } from "drizzle-orm";
import type { PublicClient } from "viem";
import { parseAbiItem } from "viem";
import { FORJA_LOCKER_ADDRESS } from "../constants";

const lockCreatedEvent = parseAbiItem(
	"event LockCreated(uint256 indexed lockId, address indexed creator, address indexed token, address beneficiary, uint256 amount, uint64 startTime, uint64 endTime, bool vestingEnabled)",
);

const tokensClaimedEvent = parseAbiItem(
	"event TokensClaimed(uint256 indexed lockId, address indexed beneficiary, uint256 amount)",
);

const lockRevokedEvent = parseAbiItem(
	"event LockRevoked(uint256 indexed lockId, uint256 returnedAmount)",
);

export async function indexLockEvents(
	db: ReturnType<typeof getDb>,
	client: PublicClient,
	fromBlock: bigint,
	toBlock: bigint,
) {
	let count = 0;

	// Index LockCreated events
	const createLogs = await client.getLogs({
		address: FORJA_LOCKER_ADDRESS,
		event: lockCreatedEvent,
		fromBlock,
		toBlock,
	});

	if (createLogs.length > 0) {
		const lockRows = createLogs.map((log) => {
			const { lockId, creator, token, beneficiary, amount, startTime, endTime, vestingEnabled } =
				log.args;
			return {
				lockId: Number(lockId ?? 0n),
				tokenAddress: (token ?? "").toLowerCase(),
				creatorAddress: (creator ?? "").toLowerCase(),
				beneficiaryAddress: (beneficiary ?? "").toLowerCase(),
				totalAmount: (amount ?? 0n).toString(),
				startTime: new Date(Number(startTime ?? 0n) * 1000),
				endTime: new Date(Number(endTime ?? 0n) * 1000),
				vestingEnabled: vestingEnabled ?? false,
				txHash: log.transactionHash ?? "",
				blockNumber: Number(log.blockNumber),
			};
		});

		await db
			.insert(schema.locks)
			.values(lockRows)
			.onConflictDoNothing({ target: schema.locks.lockId });

		count += lockRows.length;
	}

	// Index TokensClaimed events
	const claimLogs = await client.getLogs({
		address: FORJA_LOCKER_ADDRESS,
		event: tokensClaimedEvent,
		fromBlock,
		toBlock,
	});

	for (const log of claimLogs) {
		const { lockId: rawLockId, beneficiary, amount } = log.args;
		const lockId = Number(rawLockId ?? 0n);
		const amountStr = (amount ?? 0n).toString();

		await db
			.insert(schema.claims)
			.values({
				lockId,
				beneficiaryAddress: (beneficiary ?? "").toLowerCase(),
				amount: amountStr,
				txHash: log.transactionHash ?? "",
				blockNumber: Number(log.blockNumber),
			})
			.onConflictDoNothing({ target: schema.claims.txHash });

		// Update claimed amount on the lock
		const [lock] = await db
			.select({ claimedAmount: schema.locks.claimedAmount })
			.from(schema.locks)
			.where(eq(schema.locks.lockId, lockId))
			.limit(1);

		if (lock) {
			const newClaimed = BigInt(lock.claimedAmount) + BigInt(amountStr);
			await db
				.update(schema.locks)
				.set({
					claimedAmount: newClaimed.toString(),
					updatedAt: new Date(),
				})
				.where(eq(schema.locks.lockId, lockId));
		}

		count++;
	}

	// Index LockRevoked events
	const revokeLogs = await client.getLogs({
		address: FORJA_LOCKER_ADDRESS,
		event: lockRevokedEvent,
		fromBlock,
		toBlock,
	});

	for (const log of revokeLogs) {
		const { lockId } = log.args;
		await db
			.update(schema.locks)
			.set({
				revoked: true,
				updatedAt: new Date(),
			})
			.where(eq(schema.locks.lockId, Number(lockId ?? 0n)));

		count++;
	}

	return count;
}
