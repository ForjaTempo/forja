import "server-only";
import { type getDb, schema } from "@forja/db";
import type { PublicClient } from "viem";
import { parseAbiItem } from "viem";
import { FORJA_TOKEN_FACTORY_ADDRESS } from "../constants";

const tokenCreatedEvent = parseAbiItem(
	"event TokenCreated(address indexed creator, address indexed token, string name, string symbol, uint256 initialSupply)",
);

export async function indexTokenEvents(
	db: ReturnType<typeof getDb>,
	client: PublicClient,
	fromBlock: bigint,
	toBlock: bigint,
) {
	const logs = await client.getLogs({
		address: FORJA_TOKEN_FACTORY_ADDRESS,
		event: tokenCreatedEvent,
		fromBlock,
		toBlock,
	});

	if (logs.length === 0) return 0;

	const rows = logs.map((log) => {
		const { creator, token, name, symbol, initialSupply } = log.args;
		return {
			address: (token ?? "").toLowerCase(),
			name: name ?? "",
			symbol: symbol ?? "",
			initialSupply: (initialSupply ?? 0n).toString(),
			creatorAddress: (creator ?? "").toLowerCase(),
			txHash: log.transactionHash ?? "",
			blockNumber: Number(log.blockNumber),
		};
	});

	await db.insert(schema.tokens).values(rows).onConflictDoNothing({ target: schema.tokens.txHash });

	return rows.length;
}
