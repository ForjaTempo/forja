import "server-only";
import { type getDb, schema } from "@forja/db";
import type { PublicClient } from "viem";
import { parseAbiItem } from "viem";
import { FORJA_MULTISEND_ADDRESS } from "../constants";

const multisendExecutedEvent = parseAbiItem(
	"event MultisendExecuted(address indexed sender, address indexed token, uint256 recipientCount, uint256 totalAmount)",
);

export async function indexMultisendEvents(
	db: ReturnType<typeof getDb>,
	client: PublicClient,
	fromBlock: bigint,
	toBlock: bigint,
) {
	const logs = await client.getLogs({
		address: FORJA_MULTISEND_ADDRESS,
		event: multisendExecutedEvent,
		fromBlock,
		toBlock,
	});

	if (logs.length === 0) return 0;

	const rows = logs.map((log) => {
		const { sender, token, recipientCount, totalAmount } = log.args;
		return {
			senderAddress: (sender ?? "").toLowerCase(),
			tokenAddress: (token ?? "").toLowerCase(),
			recipientCount: Number(recipientCount ?? 0n),
			totalAmount: (totalAmount ?? 0n).toString(),
			txHash: log.transactionHash ?? "",
			blockNumber: Number(log.blockNumber),
		};
	});

	await db
		.insert(schema.multisends)
		.values(rows)
		.onConflictDoNothing({ target: schema.multisends.txHash });

	return rows.length;
}
