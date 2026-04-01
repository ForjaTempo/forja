import "server-only";
import { getDb, schema } from "@forja/db";
import { eq } from "drizzle-orm";
import { indexerClient } from "./client";
import { indexLockEvents } from "./index-locks";
import { indexMultisendEvents } from "./index-multisends";
import { indexTokenEvents } from "./index-tokens";

const CHUNK_SIZE = 50_000n;

interface ContractIndexer {
	name: string;
	index: (
		db: ReturnType<typeof getDb>,
		client: typeof indexerClient,
		fromBlock: bigint,
		toBlock: bigint,
	) => Promise<number>;
}

const contracts: ContractIndexer[] = [
	{ name: "token-factory", index: indexTokenEvents },
	{ name: "multisend", index: indexMultisendEvents },
	{ name: "locker", index: indexLockEvents },
];

async function getLastIndexedBlock(
	db: ReturnType<typeof getDb>,
	contractName: string,
): Promise<bigint> {
	const [state] = await db
		.select()
		.from(schema.indexerState)
		.where(eq(schema.indexerState.contractName, contractName))
		.limit(1);

	return state ? BigInt(state.lastIndexedBlock) : 0n;
}

async function updateLastIndexedBlock(
	db: ReturnType<typeof getDb>,
	contractName: string,
	blockNumber: bigint,
) {
	await db
		.insert(schema.indexerState)
		.values({
			contractName,
			lastIndexedBlock: Number(blockNumber),
			updatedAt: new Date(),
		})
		.onConflictDoUpdate({
			target: schema.indexerState.contractName,
			set: {
				lastIndexedBlock: Number(blockNumber),
				updatedAt: new Date(),
			},
		});
}

export async function runIndexer(): Promise<{
	results: Record<string, { indexed: number; toBlock: number } | { error: string }>;
}> {
	const db = getDb();
	const currentBlock = await indexerClient.getBlockNumber();
	const results: Record<string, { indexed: number; toBlock: number } | { error: string }> = {};

	for (const contract of contracts) {
		try {
			const lastBlock = await getLastIndexedBlock(db, contract.name);
			const fromBlock = lastBlock === 0n ? 1n : lastBlock + 1n;

			if (fromBlock > currentBlock) {
				results[contract.name] = { indexed: 0, toBlock: Number(currentBlock) };
				continue;
			}

			let totalIndexed = 0;
			let chunkStart = fromBlock;

			while (chunkStart <= currentBlock) {
				const chunkEnd =
					chunkStart + CHUNK_SIZE - 1n > currentBlock ? currentBlock : chunkStart + CHUNK_SIZE - 1n;

				const count = await contract.index(db, indexerClient, chunkStart, chunkEnd);
				totalIndexed += count;
				chunkStart = chunkEnd + 1n;
			}

			await updateLastIndexedBlock(db, contract.name, currentBlock);
			results[contract.name] = { indexed: totalIndexed, toBlock: Number(currentBlock) };
		} catch (err) {
			const message = err instanceof Error ? err.message : "Unknown error";
			results[contract.name] = { error: message };
		}
	}

	return { results };
}
