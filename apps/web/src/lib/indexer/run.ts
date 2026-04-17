import "server-only";
import { getDb, schema } from "@forja/db";
import { eq } from "drizzle-orm";
import { indexerClient } from "./client";
import { generateAlerts } from "./generate-alerts";
import { indexClaimEvents } from "./index-claims";
import { indexLaunchEvents } from "./index-launches";
import { indexLockEvents } from "./index-locks";
import { indexMultisendEvents } from "./index-multisends";
import { indexTip20Events } from "./index-tip20";
import { indexTokenEvents } from "./index-tokens";
import { indexTransferEvents } from "./index-transfers";

const DEFAULT_CHUNK_SIZE = 50_000n;
const TRANSFER_CHUNK_SIZE = 10_000n;
const MAX_RETRIES = 3;

/** Confirmation buffer — only index blocks that are at least this many blocks old.
 *  Protects against chain reorgs. 10 blocks ≈ 10s on Tempo PoA. */
const CONFIRMATION_BLOCKS = 10n;

interface ContractIndexer {
	name: string;
	chunkSize?: bigint;
	index: (
		db: ReturnType<typeof getDb>,
		client: typeof indexerClient,
		fromBlock: bigint,
		toBlock: bigint,
	) => Promise<number>;
}

const contracts: ContractIndexer[] = [
	// FORJA factory first so FORJA tokens land in `tokens` table before the
	// broader TIP20 sweep. Order matters because tip20-factory uses
	// ON CONFLICT DO NOTHING and must not overwrite forja / launchpad rows.
	{ name: "token-factory", index: indexTokenEvents },
	{ name: "multisend", index: indexMultisendEvents },
	{ name: "locker", index: indexLockEvents },
	{ name: "claimer", index: indexClaimEvents },
	{ name: "launchpad", index: indexLaunchEvents },
	{ name: "tip20-factory", index: indexTip20Events },
	{ name: "transfers", chunkSize: TRANSFER_CHUNK_SIZE, index: indexTransferEvents },
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
	const startTime = Date.now();
	const db = getDb();
	const latestBlock = await indexerClient.getBlockNumber();
	const safeBlock = latestBlock - CONFIRMATION_BLOCKS;
	const results: Record<string, { indexed: number; toBlock: number } | { error: string }> = {};

	if (safeBlock < 1n) {
		console.log(`[indexer] Chain too young (block ${latestBlock}), skipping`);
		return { results };
	}

	console.log(`[indexer] Starting run at block ${latestBlock} (safe: ${safeBlock})`);

	for (const contract of contracts) {
		try {
			const lastBlock = await getLastIndexedBlock(db, contract.name);
			const fromBlock = lastBlock === 0n ? 1n : lastBlock + 1n;

			if (fromBlock > safeBlock) {
				results[contract.name] = { indexed: 0, toBlock: Number(safeBlock) };
				continue;
			}

			let totalIndexed = 0;
			let chunkStart = fromBlock;
			const chunkSize = contract.chunkSize ?? DEFAULT_CHUNK_SIZE;

			while (chunkStart <= safeBlock) {
				const chunkEnd =
					chunkStart + chunkSize - 1n > safeBlock ? safeBlock : chunkStart + chunkSize - 1n;

				let chunkCount = 0;
				for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
					try {
						chunkCount = await contract.index(db, indexerClient, chunkStart, chunkEnd);
						break;
					} catch (err) {
						const msg = err instanceof Error ? err.message : "Unknown error";
						console.warn(`[indexer] ${contract.name} attempt ${attempt + 1} failed: ${msg}`);
						if (attempt === MAX_RETRIES - 1) throw err;
						await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
					}
				}
				totalIndexed += chunkCount;
				chunkStart = chunkEnd + 1n;
			}

			await updateLastIndexedBlock(db, contract.name, safeBlock);
			console.log(`[indexer] ${contract.name}: indexed ${totalIndexed} events`);
			results[contract.name] = { indexed: totalIndexed, toBlock: Number(safeBlock) };
		} catch (err) {
			const message = err instanceof Error ? err.message : "Unknown error";
			console.error(`[indexer] ${contract.name} failed: ${message}`);
			results[contract.name] = { error: message };
		}
	}

	// Generate alerts for watchlist subscribers
	try {
		await generateAlerts();
	} catch (err) {
		console.warn("[indexer] Alert generation failed:", err);
	}

	const duration = Date.now() - startTime;
	console.log(`[indexer] Run completed in ${duration}ms`);
	return { results };
}
