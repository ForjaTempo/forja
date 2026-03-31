import type { Log, PublicClient } from "viem";

/**
 * Safely fetches logs with chunked block ranges.
 *
 * Many RPC providers (including Tempo Moderato) reject getLogs queries
 * spanning from genesis (block 0). This utility fetches the current block
 * number and queries in reverse chunks of CHUNK_SIZE blocks, accumulating
 * results until MAX_CHUNKS are processed or the genesis block is reached.
 *
 * Returns logs sorted by blockNumber ascending (chronological order).
 */

const CHUNK_SIZE = 100_000n;
const MAX_CHUNKS = 10; // Up to 1M blocks back (~23 days at 2s blocks)

interface GetLogsSafeOptions {
	client: PublicClient;
	address: `0x${string}`;
	// biome-ignore lint/suspicious/noExplicitAny: viem event type inference is too complex for generic wrapper
	event: any;
	// biome-ignore lint/suspicious/noExplicitAny: viem args type tied to event type
	args?: any;
}

export async function getLogsSafe({
	client,
	address,
	event,
	args,
}: GetLogsSafeOptions): Promise<Log[]> {
	const latestBlock = await client.getBlockNumber();
	const allLogs: Log[] = [];

	for (let i = 0; i < MAX_CHUNKS; i++) {
		const toBlock = i === 0 ? latestBlock : latestBlock - CHUNK_SIZE * BigInt(i) + 1n;
		const fromBlock = latestBlock - CHUNK_SIZE * BigInt(i + 1);

		if (toBlock <= 0n) break;

		const safeFrom = fromBlock < 0n ? 0n : fromBlock;

		try {
			const logs = await client.getLogs({
				address,
				event,
				args,
				fromBlock: safeFrom,
				toBlock,
			});
			allLogs.push(...(logs as Log[]));
		} catch {
			// RPC rejected this range — stop going further back
			break;
		}

		// We've reached genesis
		if (safeFrom === 0n) break;
	}

	// Sort chronologically — chunks are fetched newest-first but each
	// chunk's internal order is ascending. Sort globally to guarantee
	// consistent chronological order regardless of chunk boundaries.
	allLogs.sort((a, b) => {
		const blockDiff = (a.blockNumber ?? 0n) - (b.blockNumber ?? 0n);
		if (blockDiff !== 0n) return blockDiff < 0n ? -1 : 1;
		return (a.logIndex ?? 0) - (b.logIndex ?? 0);
	});

	return allLogs;
}
