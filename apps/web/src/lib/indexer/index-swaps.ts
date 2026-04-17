import "server-only";
import { type getDb, schema } from "@forja/db";
import type { PublicClient } from "viem";
import { parseAbiItem } from "viem";
import { FORJA_SWAP_ROUTER_ADDRESS } from "../constants";
import { fetchBlockTimestamps } from "./utils";

const swapExecutedEvent = parseAbiItem(
	"event SwapExecuted(address indexed user, address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut, uint256 feeAmount)",
);

/**
 * Index ForjaSwapRouter `SwapExecuted` events into the `swaps` table.
 *
 * Idempotent on `(txHash, logIndex)`. Skips entirely when the router address
 * is unset (development env without a deploy yet).
 */
export async function indexSwapEvents(
	db: ReturnType<typeof getDb>,
	client: PublicClient,
	fromBlock: bigint,
	toBlock: bigint,
) {
	if (FORJA_SWAP_ROUTER_ADDRESS === "0x") return 0;

	const logs = await client.getLogs({
		address: FORJA_SWAP_ROUTER_ADDRESS,
		event: swapExecutedEvent,
		fromBlock,
		toBlock,
	});

	if (logs.length === 0) return 0;

	const blockTimestamps = await fetchBlockTimestamps(
		client,
		logs.map((l) => l.blockNumber),
	);

	const rows = logs
		.map((log) => {
			const args = log.args as {
				user?: `0x${string}`;
				tokenIn?: `0x${string}`;
				tokenOut?: `0x${string}`;
				amountIn?: bigint;
				amountOut?: bigint;
				feeAmount?: bigint;
			};
			if (!args.user || !args.tokenIn || !args.tokenOut) return null;
			return {
				txHash: log.transactionHash ?? "",
				logIndex: Number(log.logIndex ?? 0),
				blockNumber: Number(log.blockNumber),
				userAddress: args.user.toLowerCase(),
				tokenIn: args.tokenIn.toLowerCase(),
				tokenOut: args.tokenOut.toLowerCase(),
				amountIn: (args.amountIn ?? 0n).toString(),
				amountOut: (args.amountOut ?? 0n).toString(),
				feeAmount: (args.feeAmount ?? 0n).toString(),
				createdAt: blockTimestamps.get(log.blockNumber) ?? new Date(),
			};
		})
		.filter((r): r is NonNullable<typeof r> => r !== null);

	if (rows.length === 0) return 0;

	await db
		.insert(schema.swaps)
		.values(rows)
		.onConflictDoNothing({
			target: [schema.swaps.txHash, schema.swaps.logIndex],
		});

	return rows.length;
}
