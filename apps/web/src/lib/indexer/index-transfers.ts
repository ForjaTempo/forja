import "server-only";
import { type getDb, schema } from "@forja/db";
import { sql } from "drizzle-orm";
import { type PublicClient, parseAbiItem } from "viem";
import { fetchBlockTimestamps } from "./utils";

const transferEvent = parseAbiItem(
	"event Transfer(address indexed from, address indexed to, uint256 value)",
);

/** Max token addresses per getLogs call. */
const ADDRESS_BATCH_SIZE = 50;

/** Max transfer rows per DB insert batch. */
const INSERT_BATCH_SIZE = 500;

/** Zero address — from=0x0 is mint, to=0x0 is burn. */
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

interface BalanceDelta {
	delta: bigint;
	minBlock: number;
	maxBlock: number;
}

/**
 * Compute holder balance deltas from a set of transfer rows.
 * Pure function — no DB side effects.
 */
function computeBalanceDeltas(
	rows: {
		tokenAddress: string;
		fromAddress: string;
		toAddress: string;
		amount: string;
		blockNumber: number;
	}[],
): Map<string, BalanceDelta> {
	const deltas = new Map<string, BalanceDelta>();

	for (const { tokenAddress, fromAddress, toAddress, amount, blockNumber } of rows) {
		const value = BigInt(amount);

		if (fromAddress !== ZERO_ADDRESS) {
			const key = `${tokenAddress}:${fromAddress}`;
			const existing = deltas.get(key);
			if (existing) {
				existing.delta -= value;
				existing.maxBlock = Math.max(existing.maxBlock, blockNumber);
			} else {
				deltas.set(key, { delta: -value, minBlock: blockNumber, maxBlock: blockNumber });
			}
		}

		if (toAddress !== ZERO_ADDRESS) {
			const key = `${tokenAddress}:${toAddress}`;
			const existing = deltas.get(key);
			if (existing) {
				existing.delta += value;
				existing.maxBlock = Math.max(existing.maxBlock, blockNumber);
			} else {
				deltas.set(key, { delta: value, minBlock: blockNumber, maxBlock: blockNumber });
			}
		}
	}

	return deltas;
}

/**
 * Index TIP-20 Transfer events for all tokens tracked in the DB.
 *
 * Idempotency strategy:
 * - Each batch is wrapped in a DB transaction
 * - INSERT ... ON CONFLICT DO NOTHING RETURNING only yields newly-inserted rows
 * - Balance deltas are computed solely from those new rows
 * - If balance update fails, the transaction rolls back (transfers too),
 *   so a retry re-inserts and re-computes correctly
 */
export async function indexTransferEvents(
	db: ReturnType<typeof getDb>,
	client: PublicClient,
	fromBlock: bigint,
	toBlock: bigint,
) {
	// 1. Get all known token addresses — covers FORJA tokens, launchpad tokens,
	// and every TIP-20 discovered via the factory indexer. Without this we'd miss
	// transfers (and therefore holder counts, daily stats, trending score) for
	// anything that isn't FORJA-created.
	const knownTokens = await db
		.select({ address: schema.tokenHubCache.address })
		.from(schema.tokenHubCache);

	if (knownTokens.length === 0) return 0;

	const tokenAddresses = knownTokens.map((t) => t.address as `0x${string}`);

	// 2. Fetch Transfer logs in address batches
	const allLogs: Awaited<ReturnType<typeof client.getLogs<typeof transferEvent>>> = [];

	for (let i = 0; i < tokenAddresses.length; i += ADDRESS_BATCH_SIZE) {
		const batch = tokenAddresses.slice(i, i + ADDRESS_BATCH_SIZE);
		const logs = await client.getLogs({
			address: batch,
			event: transferEvent,
			fromBlock,
			toBlock,
		});
		allLogs.push(...logs);
	}

	if (allLogs.length === 0) return 0;

	// 3. Fetch block timestamps
	const blockTimestamps = await fetchBlockTimestamps(
		client,
		allLogs.map((l) => l.blockNumber),
	);

	// 4. Build transfer rows
	const transferRows = allLogs.map((log) => ({
		tokenAddress: (log.address ?? "").toLowerCase(),
		fromAddress: (log.args.from ?? "").toLowerCase(),
		toAddress: (log.args.to ?? "").toLowerCase(),
		amount: (log.args.value ?? 0n).toString(),
		txHash: log.transactionHash ?? "",
		logIndex: Number(log.logIndex ?? 0),
		blockNumber: Number(log.blockNumber),
		createdAt: blockTimestamps.get(log.blockNumber) ?? new Date(),
	}));

	// 5. Process in transactional batches — insert + balance update are atomic
	for (let i = 0; i < transferRows.length; i += INSERT_BATCH_SIZE) {
		const batch = transferRows.slice(i, i + INSERT_BATCH_SIZE);

		await db.transaction(async (tx) => {
			// Insert transfers — RETURNING only yields actually-inserted rows (not conflicts)
			const inserted = await tx
				.insert(schema.tokenTransfers)
				.values(batch)
				.onConflictDoNothing()
				.returning();

			if (inserted.length === 0) return;

			// Compute balance deltas ONLY from newly inserted transfers
			const deltas = computeBalanceDeltas(inserted);

			// Apply balance upserts within the same transaction
			for (const [key, { delta, minBlock, maxBlock }] of deltas) {
				const [tokenAddress, holderAddress] = key.split(":");
				if (!tokenAddress || !holderAddress) continue;

				if (delta > 0n) {
					await tx
						.insert(schema.tokenHolderBalances)
						.values({
							tokenAddress,
							holderAddress,
							balance: delta.toString(),
							firstSeenBlock: minBlock,
							lastUpdatedBlock: maxBlock,
						})
						.onConflictDoUpdate({
							target: [
								schema.tokenHolderBalances.tokenAddress,
								schema.tokenHolderBalances.holderAddress,
							],
							set: {
								balance: sql`(CAST(${schema.tokenHolderBalances.balance} AS NUMERIC) + ${delta.toString()})::TEXT`,
								lastUpdatedBlock: maxBlock,
							},
						});
				} else if (delta < 0n) {
					const absDelta = (-delta).toString();
					await tx
						.insert(schema.tokenHolderBalances)
						.values({
							tokenAddress,
							holderAddress,
							balance: "0",
							firstSeenBlock: minBlock,
							lastUpdatedBlock: maxBlock,
						})
						.onConflictDoUpdate({
							target: [
								schema.tokenHolderBalances.tokenAddress,
								schema.tokenHolderBalances.holderAddress,
							],
							set: {
								balance: sql`GREATEST(CAST(${schema.tokenHolderBalances.balance} AS NUMERIC) - ${absDelta}, 0)::TEXT`,
								lastUpdatedBlock: maxBlock,
							},
						});
				}
			}
		});
	}

	// 6. Clean up zero-balance rows (safe outside transaction — runs after all inserts committed)
	await db
		.delete(schema.tokenHolderBalances)
		.where(sql`${schema.tokenHolderBalances.balance} = '0'`);

	return allLogs.length;
}
