import "server-only";
import type { PublicClient } from "viem";

export async function fetchBlockTimestamps(
	client: PublicClient,
	blockNumbers: bigint[],
): Promise<Map<bigint, Date>> {
	const unique = [...new Set(blockNumbers)];
	const map = new Map<bigint, Date>();

	await Promise.all(
		unique.map(async (bn) => {
			try {
				const block = await client.getBlock({ blockNumber: bn });
				map.set(bn, new Date(Number(block.timestamp) * 1000));
			} catch {
				// Fallback to current time at call site
			}
		}),
	);

	return map;
}
