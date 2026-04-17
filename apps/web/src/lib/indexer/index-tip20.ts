import "server-only";
import { type getDb, schema } from "@forja/db";
import type { PublicClient } from "viem";
import { parseAbiItem } from "viem";
import { TIP20_FACTORY_ADDRESS } from "../constants";
import { fetchBlockTimestamps } from "./utils";

/**
 * Tempo TIP20 factory `TokenCreated` event.
 * Signature per docs.tempo.xyz/protocol/tip20/spec.
 *
 * If the production log shape diverges (e.g. creator renamed to issuer), adjust
 * the signature and redeploy. Raw log dump can be inspected via
 * `eth_getLogs({ address: TIP20_FACTORY_ADDRESS, fromBlock, toBlock })` without
 * a typed ABI to verify field ordering.
 */
const tokenCreatedEvent = parseAbiItem(
	"event TokenCreated(address indexed token, address indexed creator, string name, string symbol, uint8 decimals)",
);

/**
 * Index TIP-20 tokens created via Tempo's factory precompile.
 *
 * Strategy:
 *   - Upsert into `token_hub_cache` with `source = "tip20_factory"`.
 *   - ON CONFLICT DO NOTHING — we never downgrade a FORJA or launchpad row.
 *   - FORJA-created tokens are indexed independently by `index-tokens` and
 *     inserted into `tokens`; `token-list-sync` then reconciles them here
 *     with `source = "forja"`. If a TIP20 factory event arrives for a token
 *     already present (e.g. because FORJA's factory ultimately calls the
 *     TIP20 precompile), the existing row is preserved.
 *   - `totalSupply` is NOT fetched here (RPC call per token too costly for
 *     large backfills). Left null; filled by token-list-sync or on-demand.
 */
export async function indexTip20Events(
	db: ReturnType<typeof getDb>,
	client: PublicClient,
	fromBlock: bigint,
	toBlock: bigint,
) {
	const logs = await client.getLogs({
		address: TIP20_FACTORY_ADDRESS,
		event: tokenCreatedEvent,
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
				token?: `0x${string}`;
				creator?: `0x${string}`;
				name?: string;
				symbol?: string;
				decimals?: number;
			};
			if (!args.token) return null;
			return {
				address: args.token.toLowerCase(),
				name: args.name ?? "",
				symbol: args.symbol ?? "",
				decimals: typeof args.decimals === "number" ? args.decimals : 6,
				creatorAddress: args.creator?.toLowerCase() ?? null,
				isForjaCreated: false,
				isLaunchpadToken: false,
				source: "tip20_factory" as const,
				lastSyncedAt: new Date(),
				createdAt: blockTimestamps.get(log.blockNumber) ?? new Date(),
			};
		})
		.filter((r): r is NonNullable<typeof r> => r !== null);

	if (rows.length === 0) return 0;

	// Deduplicate within batch (same token address could appear twice if factory
	// is re-entered in same chunk). Last wins.
	const unique = new Map<string, (typeof rows)[number]>();
	for (const row of rows) {
		unique.set(row.address, row);
	}

	// ON CONFLICT DO NOTHING preserves FORJA / launchpad / previously-seen rows.
	await db
		.insert(schema.tokenHubCache)
		.values(Array.from(unique.values()))
		.onConflictDoNothing({ target: schema.tokenHubCache.address });

	return unique.size;
}
