import "server-only";
import type { PublicClient } from "viem";

const RPC_BATCH_SIZE = 10;

export async function fetchBlockTimestamps(
	client: PublicClient,
	blockNumbers: bigint[],
): Promise<Map<bigint, Date>> {
	const unique = [...new Set(blockNumbers)];
	const map = new Map<bigint, Date>();

	for (let i = 0; i < unique.length; i += RPC_BATCH_SIZE) {
		const batch = unique.slice(i, i + RPC_BATCH_SIZE);
		const results = await Promise.allSettled(
			batch.map(async (bn) => {
				const block = await client.getBlock({ blockNumber: bn });
				return { bn, date: new Date(Number(block.timestamp) * 1000) };
			}),
		);

		for (const result of results) {
			if (result.status === "fulfilled") {
				map.set(result.value.bn, result.value.date);
			} else {
				console.warn(`[indexer] Failed to fetch block timestamp: ${result.reason}`);
			}
		}
	}

	return map;
}
