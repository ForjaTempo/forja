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

/** Zero address — from=0x0 is mint, to=0x0 is burn. */
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

/**
 * Index TIP-20 Transfer events for all tokens tracked in the DB.
 * Updates both token_transfers (append-only log) and token_holder_balances (incremental).
 */
export async function indexTransferEvents(
	db: ReturnType<typeof getDb>,
	client: PublicClient,
	fromBlock: bigint,
	toBlock: bigint,
) {
	// 1. Get all known token addresses from DB
	const knownTokens = await db.select({ address: schema.tokens.address }).from(schema.tokens);

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

	// 5. Batch insert transfers (idempotent via unique constraint)
	const INSERT_BATCH_SIZE = 500;
	for (let i = 0; i < transferRows.length; i += INSERT_BATCH_SIZE) {
		const batch = transferRows.slice(i, i + INSERT_BATCH_SIZE);
		await db.insert(schema.tokenTransfers).values(batch).onConflictDoNothing();
	}

	// 6. Update holder balances incrementally
	const balanceDeltas = new Map<string, { delta: bigint; minBlock: number; maxBlock: number }>();

	for (const row of transferRows) {
		const { tokenAddress, fromAddress, toAddress, amount, blockNumber } = row;
		const value = BigInt(amount);

		// Debit sender (skip zero address — that's a mint)
		if (fromAddress !== ZERO_ADDRESS) {
			const senderKey = `${tokenAddress}:${fromAddress}`;
			const existing = balanceDeltas.get(senderKey);
			if (existing) {
				existing.delta -= value;
				existing.maxBlock = Math.max(existing.maxBlock, blockNumber);
			} else {
				balanceDeltas.set(senderKey, {
					delta: -value,
					minBlock: blockNumber,
					maxBlock: blockNumber,
				});
			}
		}

		// Credit receiver (skip zero address — that's a burn)
		if (toAddress !== ZERO_ADDRESS) {
			const receiverKey = `${tokenAddress}:${toAddress}`;
			const existing = balanceDeltas.get(receiverKey);
			if (existing) {
				existing.delta += value;
				existing.maxBlock = Math.max(existing.maxBlock, blockNumber);
			} else {
				balanceDeltas.set(receiverKey, {
					delta: value,
					minBlock: blockNumber,
					maxBlock: blockNumber,
				});
			}
		}
	}

	// 7. Apply balance upserts
	for (const [key, { delta, minBlock, maxBlock }] of balanceDeltas) {
		const [tokenAddress, holderAddress] = key.split(":");
		if (!tokenAddress || !holderAddress) continue;

		if (delta > 0n) {
			// Credit: upsert with positive delta
			await db
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
			// Debit: upsert with negative delta (absolute subtraction)
			const absDelta = (-delta).toString();
			await db
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
		// delta === 0n → no-op
	}

	// 8. Clean up zero-balance rows
	await db
		.delete(schema.tokenHolderBalances)
		.where(sql`${schema.tokenHolderBalances.balance} = '0'`);

	return allLogs.length;
}
