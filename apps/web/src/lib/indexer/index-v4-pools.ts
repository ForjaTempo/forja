import "server-only";
import { type getDb, schema } from "@forja/db";
import type { PublicClient } from "viem";
import { parseAbiItem } from "viem";
import { POOL_MANAGER_ADDRESS } from "../constants";

const initializeEvent = parseAbiItem(
	"event Initialize(bytes32 indexed id, address indexed currency0, address indexed currency1, uint24 fee, int24 tickSpacing, address hooks, uint160 sqrtPriceX96, int24 tick)",
);

/**
 * Index Uniswap v4 `Initialize` events so the frontend knows which tokens have
 * a swappable pool without hitting the chain on every TokenPicker open.
 *
 * Idempotent on `poolId` (the event's indexed bytes32 PoolId is globally
 * unique). We store every initialised pool regardless of hook or fee tier;
 * the frontend filters by currency when listing pool-backed tokens.
 */
export async function indexV4PoolEvents(
	db: ReturnType<typeof getDb>,
	client: PublicClient,
	fromBlock: bigint,
	toBlock: bigint,
) {
	const logs = await client.getLogs({
		address: POOL_MANAGER_ADDRESS,
		event: initializeEvent,
		fromBlock,
		toBlock,
	});

	if (logs.length === 0) return 0;

	const rows = logs
		.map((log) => {
			const args = log.args as {
				id?: `0x${string}`;
				currency0?: `0x${string}`;
				currency1?: `0x${string}`;
				fee?: number;
				tickSpacing?: number;
				hooks?: `0x${string}`;
			};
			if (!args.id || !args.currency0 || !args.currency1) return null;
			return {
				poolId: args.id.toLowerCase(),
				currency0: args.currency0.toLowerCase(),
				currency1: args.currency1.toLowerCase(),
				fee: Number(args.fee ?? 0),
				tickSpacing: Number(args.tickSpacing ?? 0),
				hooks: (args.hooks ?? "0x0000000000000000000000000000000000000000").toLowerCase(),
				blockNumber: Number(log.blockNumber),
				txHash: log.transactionHash ?? "",
			};
		})
		.filter((r): r is NonNullable<typeof r> => r !== null);

	if (rows.length === 0) return 0;

	await db
		.insert(schema.v4Pools)
		.values(rows)
		.onConflictDoNothing({ target: schema.v4Pools.poolId });

	return rows.length;
}
