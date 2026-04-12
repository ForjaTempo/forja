import "server-only";
import { type getDb, schema } from "@forja/db";
import { and, eq, sql } from "drizzle-orm";
import type { PublicClient } from "viem";
import { parseAbiItem } from "viem";
import { FORJA_LAUNCHPAD_ADDRESS } from "../constants";
import { fetchBlockTimestamps } from "./utils";

const launchCreatedEvent = parseAbiItem(
	"event LaunchCreated(uint256 indexed launchId, address indexed creator, address indexed token, string name, string symbol, string description, string imageUri)",
);

const tokenBoughtEvent = parseAbiItem(
	"event TokenBought(uint256 indexed launchId, address indexed buyer, uint256 usdcSpent, uint256 tokensReceived, uint256 newPrice)",
);

const tokenSoldEvent = parseAbiItem(
	"event TokenSold(uint256 indexed launchId, address indexed seller, uint256 tokensSold, uint256 usdcReceived, uint256 fee, uint256 newPrice)",
);

const graduatedEvent = parseAbiItem(
	"event Graduated(uint256 indexed launchId, address indexed token, uint256 usdcInPool, uint256 tokensInPool)",
);

const launchKilledEvent = parseAbiItem("event LaunchKilled(uint256 indexed launchId)");
const launchFailedEvent = parseAbiItem("event LaunchFailed(uint256 indexed launchId)");

const contractAddr = FORJA_LAUNCHPAD_ADDRESS.toLowerCase();

// Trading fee = 1% (100 bps), round up
const TRADING_FEE_BPS = 100n;
const BPS_DENOMINATOR = 10000n;

export async function indexLaunchEvents(
	db: ReturnType<typeof getDb>,
	client: PublicClient,
	fromBlock: bigint,
	toBlock: bigint,
) {
	if (FORJA_LAUNCHPAD_ADDRESS === "0x") return 0;

	let totalIndexed = 0;

	// 1. Index LaunchCreated events
	const createLogs = await client.getLogs({
		address: FORJA_LAUNCHPAD_ADDRESS,
		event: launchCreatedEvent,
		fromBlock,
		toBlock,
	});

	if (createLogs.length > 0) {
		const timestamps = await fetchBlockTimestamps(
			client,
			createLogs.map((l) => l.blockNumber),
		);

		const rows = createLogs.map((log) => ({
			contractAddress: contractAddr,
			launchId: (log.args.launchId ?? 0n).toString(),
			tokenAddress: (log.args.token ?? "").toLowerCase(),
			creatorAddress: (log.args.creator ?? "").toLowerCase(),
			name: log.args.name ?? "",
			symbol: log.args.symbol ?? "",
			description: log.args.description ?? "",
			imageUri: log.args.imageUri ?? "",
			virtualTokens: "1073000000000000", // VIRTUAL_TOKEN_RESERVE
			virtualUsdc: "30000000000", // VIRTUAL_USDC_RESERVE
			txHash: log.transactionHash ?? "",
			blockNumber: Number(log.blockNumber),
			createdAt: timestamps.get(log.blockNumber) ?? new Date(),
		}));

		await db
			.insert(schema.launches)
			.values(rows)
			.onConflictDoNothing({
				target: [schema.launches.contractAddress, schema.launches.launchId],
			});

		totalIndexed += rows.length;
	}

	// 2. Index TokenBought events
	const buyLogs = await client.getLogs({
		address: FORJA_LAUNCHPAD_ADDRESS,
		event: tokenBoughtEvent,
		fromBlock,
		toBlock,
	});

	if (buyLogs.length > 0) {
		for (const log of buyLogs) {
			const launchIdStr = (log.args.launchId ?? 0n).toString();

			// Find the DB launch id
			const [launch] = await db
				.select({ id: schema.launches.id })
				.from(schema.launches)
				.where(
					and(
						eq(schema.launches.contractAddress, contractAddr),
						eq(schema.launches.launchId, launchIdStr),
					),
				)
				.limit(1);

			if (!launch) continue;

			const usdcSpent = log.args.usdcSpent ?? 0n;
			const tokensReceived = log.args.tokensReceived ?? 0n;
			const newPrice = (log.args.newPrice ?? 0n).toString();

			// Calculate fee (1% of usdcSpent, round up)
			const fee = (usdcSpent * TRADING_FEE_BPS + BPS_DENOMINATOR - 1n) / BPS_DENOMINATOR;
			const netUsdc = usdcSpent - fee;

			// Atomic: insert trade + update aggregate in single transaction
			// If insert succeeds but update fails, both roll back — no drift
			// If trade is duplicate (conflict), skip aggregate update entirely
			await db.transaction(async (tx) => {
				const inserted = await tx
					.insert(schema.launchTrades)
					.values({
						launchDbId: launch.id,
						traderAddress: (log.args.buyer ?? "").toLowerCase(),
						type: "buy",
						tokenAmount: tokensReceived.toString(),
						usdcAmount: usdcSpent.toString(),
						fee: fee.toString(),
						newPrice,
						txHash: log.transactionHash ?? "",
						blockNumber: Number(log.blockNumber),
						logIndex: Number(log.logIndex),
					})
					.onConflictDoNothing({
						target: [schema.launchTrades.txHash, schema.launchTrades.logIndex],
					})
					.returning({ id: schema.launchTrades.id });

				if (inserted.length > 0) {
					await tx
						.update(schema.launches)
						.set({
							realTokensSold: sql`(CAST(${schema.launches.realTokensSold} AS NUMERIC) + ${tokensReceived.toString()})::text`,
							realUsdcRaised: sql`(CAST(${schema.launches.realUsdcRaised} AS NUMERIC) + ${netUsdc.toString()})::text`,
						})
						.where(eq(schema.launches.id, launch.id));
				}
			});
		}
		totalIndexed += buyLogs.length;
	}

	// 3. Index TokenSold events
	const sellLogs = await client.getLogs({
		address: FORJA_LAUNCHPAD_ADDRESS,
		event: tokenSoldEvent,
		fromBlock,
		toBlock,
	});

	if (sellLogs.length > 0) {
		for (const log of sellLogs) {
			const launchIdStr = (log.args.launchId ?? 0n).toString();

			const [launch] = await db
				.select({ id: schema.launches.id })
				.from(schema.launches)
				.where(
					and(
						eq(schema.launches.contractAddress, contractAddr),
						eq(schema.launches.launchId, launchIdStr),
					),
				)
				.limit(1);

			if (!launch) continue;

			const tokensSold = log.args.tokensSold ?? 0n;
			const usdcReceived = log.args.usdcReceived ?? 0n;
			const fee = log.args.fee ?? 0n;
			const newPrice = (log.args.newPrice ?? 0n).toString();

			// grossUsdcOut = usdcReceived (net to user) + fee (total)
			// creatorShare stays in contract, treasuryShare leaves
			// poolDebit = netUsdcOut + treasuryShare = usdcReceived + (fee - creatorShare)
			// But for DB tracking, we decrement realTokensSold and realUsdcRaised
			// using the same poolDebit logic as the contract:
			// creatorShare = fee * 5000 / 10000 = fee / 2
			const creatorShare = fee / 2n;
			const treasuryShare = fee - creatorShare;
			const poolDebit = usdcReceived + treasuryShare;

			// Atomic: insert trade + update aggregate in single transaction
			await db.transaction(async (tx) => {
				const inserted = await tx
					.insert(schema.launchTrades)
					.values({
						launchDbId: launch.id,
						traderAddress: (log.args.seller ?? "").toLowerCase(),
						type: "sell",
						tokenAmount: tokensSold.toString(),
						usdcAmount: usdcReceived.toString(),
						fee: fee.toString(),
						newPrice,
						txHash: log.transactionHash ?? "",
						blockNumber: Number(log.blockNumber),
						logIndex: Number(log.logIndex),
					})
					.onConflictDoNothing({
						target: [schema.launchTrades.txHash, schema.launchTrades.logIndex],
					})
					.returning({ id: schema.launchTrades.id });

				if (inserted.length > 0) {
					await tx
						.update(schema.launches)
						.set({
							realTokensSold: sql`(CAST(${schema.launches.realTokensSold} AS NUMERIC) - ${tokensSold.toString()})::text`,
							realUsdcRaised: sql`(CAST(${schema.launches.realUsdcRaised} AS NUMERIC) - ${poolDebit.toString()})::text`,
						})
						.where(eq(schema.launches.id, launch.id));
				}
			});
		}
		totalIndexed += sellLogs.length;
	}

	// 4. Index Graduated events
	const gradLogs = await client.getLogs({
		address: FORJA_LAUNCHPAD_ADDRESS,
		event: graduatedEvent,
		fromBlock,
		toBlock,
	});

	for (const log of gradLogs) {
		const launchIdStr = (log.args.launchId ?? 0n).toString();
		const tokenAddr = (log.args.token ?? "").toLowerCase();
		const timestamps = await fetchBlockTimestamps(client, [log.blockNumber]);

		await db
			.update(schema.launches)
			.set({
				graduated: true,
				graduatedAt: timestamps.get(log.blockNumber) ?? new Date(),
			})
			.where(
				and(
					eq(schema.launches.contractAddress, contractAddr),
					eq(schema.launches.launchId, launchIdStr),
				),
			);

		// Mark token as launchpad token in tokenHubCache (upsert to avoid missing if row doesn't exist yet)
		if (tokenAddr) {
			const [launchRow] = await db
				.select({
					name: schema.launches.name,
					symbol: schema.launches.symbol,
					creatorAddress: schema.launches.creatorAddress,
				})
				.from(schema.launches)
				.where(
					and(
						eq(schema.launches.contractAddress, contractAddr),
						eq(schema.launches.launchId, launchIdStr),
					),
				)
				.limit(1);

			await db
				.insert(schema.tokenHubCache)
				.values({
					address: tokenAddr,
					name: launchRow?.name ?? "Unknown",
					symbol: launchRow?.symbol ?? "???",
					isForjaCreated: true,
					isLaunchpadToken: true,
					creatorAddress: launchRow?.creatorAddress ?? null,
				})
				.onConflictDoUpdate({
					target: schema.tokenHubCache.address,
					set: { isLaunchpadToken: true },
				});
		}
	}
	totalIndexed += gradLogs.length;

	// 5. Index LaunchKilled events
	const killLogs = await client.getLogs({
		address: FORJA_LAUNCHPAD_ADDRESS,
		event: launchKilledEvent,
		fromBlock,
		toBlock,
	});

	for (const log of killLogs) {
		const launchIdStr = (log.args.launchId ?? 0n).toString();
		await db
			.update(schema.launches)
			.set({ killed: true })
			.where(
				and(
					eq(schema.launches.contractAddress, contractAddr),
					eq(schema.launches.launchId, launchIdStr),
				),
			);
	}
	totalIndexed += killLogs.length;

	// 6. Index LaunchFailed events
	const failLogs = await client.getLogs({
		address: FORJA_LAUNCHPAD_ADDRESS,
		event: launchFailedEvent,
		fromBlock,
		toBlock,
	});

	for (const log of failLogs) {
		const launchIdStr = (log.args.launchId ?? 0n).toString();
		await db
			.update(schema.launches)
			.set({ failed: true })
			.where(
				and(
					eq(schema.launches.contractAddress, contractAddr),
					eq(schema.launches.launchId, launchIdStr),
				),
			);
	}
	totalIndexed += failLogs.length;

	return totalIndexed;
}
