import "server-only";
import { type getDb, schema } from "@forja/db";
import { and, eq, isNull } from "drizzle-orm";
import type { PublicClient } from "viem";
import { TIP20_FACTORY_ADDRESS } from "../constants";
import { erc20Abi } from "../contracts";
import { fetchBlockTimestamps } from "./utils";

/**
 * Topic hash for Tempo's TIP20Factory `TokenCreated` event.
 *
 * Derived by sampling live on-chain logs from 0x20Fc000000000000000000000000000000000000.
 * The event's non-indexed payload includes an underlying asset address, a bytes32
 * identifier, a bytes20 salt-like field, and three dynamic strings (name, symbol,
 * denomination). Because the full structure is complex and version-sensitive, we
 * only parse `topics[0]` (event sig) and `topics[1]` (new token address). Token
 * metadata (name, symbol, decimals) is pulled via standard ERC-20 view calls.
 */
const TOKEN_CREATED_TOPIC = "0x44f7b8011db3e3647a530b4ff635726de5fafc8fa8ad10f0f31c0eb9dd52fc65";

const METADATA_BATCH = 8;

/** Max rows per run for the NULL-supply backfill pass. Capped to keep a single
 *  indexer run bounded — successive runs eventually cover all rows. */
const SUPPLY_BACKFILL_PER_RUN = 100;

/**
 * Fetch name / symbol / decimals / totalSupply for a freshly discovered token
 * via standard ERC-20 view calls. Returns null values when a call fails so we
 * don't hang the indexer on a malformed token.
 */
async function readTokenMetadata(
	client: PublicClient,
	address: `0x${string}`,
): Promise<{
	name: string | null;
	symbol: string | null;
	decimals: number | null;
	totalSupply: string | null;
}> {
	const [nameResult, symbolResult, decimalsResult, supplyResult] = await Promise.allSettled([
		client.readContract({ address, abi: erc20Abi, functionName: "name" }),
		client.readContract({ address, abi: erc20Abi, functionName: "symbol" }),
		client.readContract({ address, abi: erc20Abi, functionName: "decimals" }),
		client.readContract({ address, abi: erc20Abi, functionName: "totalSupply" }),
	]);

	return {
		name:
			nameResult.status === "fulfilled" && typeof nameResult.value === "string"
				? nameResult.value
				: null,
		symbol:
			symbolResult.status === "fulfilled" && typeof symbolResult.value === "string"
				? symbolResult.value
				: null,
		decimals:
			decimalsResult.status === "fulfilled" && typeof decimalsResult.value === "number"
				? decimalsResult.value
				: decimalsResult.status === "fulfilled" && typeof decimalsResult.value === "bigint"
					? Number(decimalsResult.value)
					: null,
		totalSupply:
			supplyResult.status === "fulfilled" && typeof supplyResult.value === "bigint"
				? supplyResult.value.toString()
				: null,
	};
}

/**
 * Decode a 32-byte topic into a lowercase checksummed-style address string.
 */
function topicToAddress(topic: `0x${string}`): string {
	return `0x${topic.slice(-40)}`.toLowerCase();
}

/**
 * Index TIP-20 tokens created via Tempo's factory precompile.
 *
 * Strategy:
 *   - Filter logs by topic[0] (event sig hash).
 *   - Extract token address from topics[1] (no complex data decoding).
 *   - Fetch name/symbol/decimals via ERC-20 view calls (batched by METADATA_BATCH
 *     to avoid hammering the RPC with thousands of parallel requests).
 *   - Upsert into tokenHubCache with source="tip20_factory", ON CONFLICT DO NOTHING
 *     so existing forja/launchpad rows are preserved.
 */
export async function indexTip20Events(
	db: ReturnType<typeof getDb>,
	client: PublicClient,
	fromBlock: bigint,
	toBlock: bigint,
) {
	const logs = await client.getLogs({
		address: TIP20_FACTORY_ADDRESS,
		fromBlock,
		toBlock,
	});

	// Filter to TokenCreated events (by topic[0]) and extract token addresses.
	const candidates = logs
		.filter((l) => l.topics[0] === TOKEN_CREATED_TOPIC && l.topics[1])
		.map((l) => ({
			address: topicToAddress(l.topics[1] as `0x${string}`),
			blockNumber: l.blockNumber,
		}));

	if (candidates.length === 0) return 0;

	// Deduplicate within this batch.
	const uniqueAddresses = Array.from(new Map(candidates.map((c) => [c.address, c])).values());

	const blockTimestamps = await fetchBlockTimestamps(
		client,
		uniqueAddresses.map((c) => c.blockNumber),
	);

	// Batch metadata fetches to respect RPC rate limits.
	const rows: Array<typeof schema.tokenHubCache.$inferInsert> = [];
	for (let i = 0; i < uniqueAddresses.length; i += METADATA_BATCH) {
		const batch = uniqueAddresses.slice(i, i + METADATA_BATCH);
		const metadata = await Promise.all(
			batch.map((c) => readTokenMetadata(client, c.address as `0x${string}`)),
		);

		batch.forEach((c, j) => {
			const meta = metadata[j];
			// Skip tokens where we can't resolve basic metadata — they may be malformed
			// or the factory may have emitted a spurious event.
			if (!meta?.name && !meta?.symbol) return;
			rows.push({
				address: c.address,
				name: meta.name ?? "",
				symbol: meta.symbol ?? "",
				decimals: meta.decimals ?? 6,
				totalSupply: meta.totalSupply,
				creatorAddress: null,
				isForjaCreated: false,
				isLaunchpadToken: false,
				source: "tip20_factory",
				lastSyncedAt: new Date(),
				createdAt: blockTimestamps.get(c.blockNumber) ?? new Date(),
			});
		});
	}

	if (rows.length === 0) return 0;

	await db
		.insert(schema.tokenHubCache)
		.values(rows)
		.onConflictDoNothing({ target: schema.tokenHubCache.address });

	// Backfill totalSupply for rows that existed before the RPC-metadata fetch
	// was added. These are the 900+ tokens that got ingested in the first
	// Data-1 pass without a supply read. Capped per run; subsequent runs
	// continue chipping away.
	await backfillMissingSupply(db, client);

	return rows.length;
}

/**
 * Fetch totalSupply() for tokenHubCache rows where it is currently NULL.
 * Runs after the main indexer pass — bounded by SUPPLY_BACKFILL_PER_RUN so
 * one run never starves the other contract indexers.
 */
async function backfillMissingSupply(db: ReturnType<typeof getDb>, client: PublicClient) {
	const candidates = await db
		.select({ address: schema.tokenHubCache.address })
		.from(schema.tokenHubCache)
		.where(
			and(
				isNull(schema.tokenHubCache.totalSupply),
				eq(schema.tokenHubCache.isLaunchpadToken, false),
			),
		)
		.limit(SUPPLY_BACKFILL_PER_RUN);

	if (candidates.length === 0) return;

	for (let i = 0; i < candidates.length; i += METADATA_BATCH) {
		const batch = candidates.slice(i, i + METADATA_BATCH);
		const supplies = await Promise.allSettled(
			batch.map((c) =>
				client.readContract({
					address: c.address as `0x${string}`,
					abi: erc20Abi,
					functionName: "totalSupply",
				}),
			),
		);

		for (let j = 0; j < batch.length; j++) {
			const row = batch[j];
			const res = supplies[j];
			if (!row || !res || res.status !== "fulfilled") continue;
			if (typeof res.value !== "bigint") continue;

			await db
				.update(schema.tokenHubCache)
				.set({ totalSupply: res.value.toString() })
				.where(eq(schema.tokenHubCache.address, row.address));
		}
	}
}
