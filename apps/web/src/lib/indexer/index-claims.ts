import "server-only";
import { type getDb, schema } from "@forja/db";
import { and, eq, isNull, sql } from "drizzle-orm";
import type { PublicClient } from "viem";
import { parseAbiItem } from "viem";
import { FORJA_CLAIMER_ADDRESS } from "../constants";

const claimerAddress = FORJA_CLAIMER_ADDRESS;
const isClaimerConfigured = claimerAddress !== "0x";

const campaignCreatedEvent = parseAbiItem(
	"event CampaignCreated(uint256 indexed campaignId, address indexed creator, address indexed token, bytes32 merkleRoot, uint256 totalDeposited, uint64 startTime, uint64 endTime, bool sweepEnabled)",
);

const claimedEvent = parseAbiItem(
	"event Claimed(uint256 indexed campaignId, address indexed recipient, uint256 amount, bytes32 leaf)",
);

const campaignSweptEvent = parseAbiItem(
	"event CampaignSwept(uint256 indexed campaignId, address indexed creator, uint256 amount)",
);

function campaignWhere(contractAddr: string, campaignId: string) {
	return and(
		eq(schema.claimCampaigns.contractAddress, contractAddr.toLowerCase()),
		eq(schema.claimCampaigns.campaignId, campaignId),
	);
}

export async function indexClaimEvents(
	db: ReturnType<typeof getDb>,
	client: PublicClient,
	fromBlock: bigint,
	toBlock: bigint,
) {
	if (!isClaimerConfigured) return 0;

	const [createLogs, claimLogs, sweepLogs] = await Promise.all([
		client.getLogs({
			address: claimerAddress,
			event: campaignCreatedEvent,
			fromBlock,
			toBlock,
		}),
		client.getLogs({
			address: claimerAddress,
			event: claimedEvent,
			fromBlock,
			toBlock,
		}),
		client.getLogs({
			address: claimerAddress,
			event: campaignSweptEvent,
			fromBlock,
			toBlock,
		}),
	]);

	let count = 0;
	const contractAddr = claimerAddress.toLowerCase();

	// CampaignCreated: campaign row should already exist (inserted by storeCampaign server
	// action after the user's tx confirmed). The indexer is purely a backfill of
	// createdBlock/createdTxHash if the row landed before tx hash was known. Missing
	// rows are skipped — they cannot be reconstructed without merkle proofs.
	for (const log of createLogs) {
		const campaignId = (log.args.campaignId ?? 0n).toString();
		await db
			.update(schema.claimCampaigns)
			.set({
				createdBlock: Number(log.blockNumber),
				createdTxHash: (log.transactionHash ?? "").toLowerCase(),
			})
			.where(
				and(campaignWhere(contractAddr, campaignId), eq(schema.claimCampaigns.createdTxHash, "")),
			);
		count++;
	}

	// Claimed: mark proof as claimed + bump campaign aggregates idempotently.
	for (const log of claimLogs) {
		const campaignId = (log.args.campaignId ?? 0n).toString();
		const recipient = (log.args.recipient ?? "").toString().toLowerCase();
		const amount = (log.args.amount ?? 0n).toString();
		const txHash = (log.transactionHash ?? "").toLowerCase();

		const [campaign] = await db
			.select({ id: schema.claimCampaigns.id })
			.from(schema.claimCampaigns)
			.where(campaignWhere(contractAddr, campaignId))
			.limit(1);
		if (!campaign) continue;

		// Only update the proof row if it has not been marked claimed yet.
		// returning() lets us know whether we actually changed a row, so the
		// aggregate increment below is idempotent.
		const updated = await db
			.update(schema.claimProofs)
			.set({
				claimedAt: new Date(),
				claimedTxHash: txHash,
			})
			.where(
				and(
					eq(schema.claimProofs.campaignDbId, campaign.id),
					eq(schema.claimProofs.recipientAddress, recipient),
					isNull(schema.claimProofs.claimedAt),
				),
			)
			.returning({ id: schema.claimProofs.id });

		if (updated.length > 0) {
			await db
				.update(schema.claimCampaigns)
				.set({
					claimedCount: sql`${schema.claimCampaigns.claimedCount} + 1`,
					totalClaimed: sql`(CAST(${schema.claimCampaigns.totalClaimed} AS NUMERIC) + ${amount})::text`,
				})
				.where(eq(schema.claimCampaigns.id, campaign.id));
		}

		count++;
	}

	// CampaignSwept: mark swept = true (idempotent)
	for (const log of sweepLogs) {
		const campaignId = (log.args.campaignId ?? 0n).toString();
		await db
			.update(schema.claimCampaigns)
			.set({ swept: true })
			.where(campaignWhere(contractAddr, campaignId));
		count++;
	}

	return count;
}
