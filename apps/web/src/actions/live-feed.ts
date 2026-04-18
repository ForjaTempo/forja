"use server";
import { getDb, schema } from "@forja/db";
import { desc } from "drizzle-orm";
import { indexerClient } from "@/lib/indexer/client";

export type LiveEventKind = "create" | "lock" | "launch" | "claim" | "multisend" | "swap";

export interface LiveEvent {
	kind: LiveEventKind;
	text: string;
	secondsAgo: number;
	txHash: string;
}

const MAX_PER_KIND = 3;

/** Compact "X minutes ago" / "Ys ago" helper — seconds-precise for the feed. */
function secondsAgo(d: Date): number {
	return Math.max(1, Math.floor((Date.now() - d.getTime()) / 1000));
}

function truncAddr(a: string): string {
	return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

/**
 * Pull the freshest on-chain events across all six tools + the current block
 * height. Used by the landing page's live-feed panel — fully real data,
 * no mock.
 */
export async function getLandingLiveFeed(): Promise<{ events: LiveEvent[]; block: number | null }> {
	try {
		const db = getDb();

		const [tokens, locks, launches, claims, multisends, swaps, latestBlock] = await Promise.all([
			db
				.select({
					txHash: schema.tokens.txHash,
					symbol: schema.tokens.symbol,
					creator: schema.tokens.creatorAddress,
					createdAt: schema.tokens.createdAt,
				})
				.from(schema.tokens)
				.orderBy(desc(schema.tokens.createdAt))
				.limit(MAX_PER_KIND),
			db
				.select({
					txHash: schema.locks.txHash,
					tokenAddress: schema.locks.tokenAddress,
					totalAmount: schema.locks.totalAmount,
					endTime: schema.locks.endTime,
					createdAt: schema.locks.createdAt,
				})
				.from(schema.locks)
				.orderBy(desc(schema.locks.createdAt))
				.limit(MAX_PER_KIND),
			db
				.select({
					txHash: schema.launches.txHash,
					symbol: schema.launches.symbol,
					graduated: schema.launches.graduated,
					createdAt: schema.launches.createdAt,
				})
				.from(schema.launches)
				.orderBy(desc(schema.launches.createdAt))
				.limit(MAX_PER_KIND),
			db
				.select({
					txHash: schema.claimCampaigns.createdTxHash,
					title: schema.claimCampaigns.title,
					recipientCount: schema.claimCampaigns.recipientCount,
					createdAt: schema.claimCampaigns.createdAt,
				})
				.from(schema.claimCampaigns)
				.orderBy(desc(schema.claimCampaigns.createdAt))
				.limit(MAX_PER_KIND),
			db
				.select({
					txHash: schema.multisends.txHash,
					recipientCount: schema.multisends.recipientCount,
					createdAt: schema.multisends.createdAt,
				})
				.from(schema.multisends)
				.orderBy(desc(schema.multisends.createdAt))
				.limit(MAX_PER_KIND),
			db
				.select({
					txHash: schema.swaps.txHash,
					tokenIn: schema.swaps.tokenIn,
					tokenOut: schema.swaps.tokenOut,
					createdAt: schema.swaps.createdAt,
				})
				.from(schema.swaps)
				.orderBy(desc(schema.swaps.createdAt))
				.limit(MAX_PER_KIND),
			indexerClient.getBlockNumber().catch(() => null),
		]);

		const events: LiveEvent[] = [
			...tokens.map<LiveEvent>((t) => ({
				kind: "create",
				text: `${t.symbol ?? "?"} deployed by ${truncAddr(t.creator)}`,
				secondsAgo: secondsAgo(t.createdAt),
				txHash: t.txHash,
			})),
			...locks.map<LiveEvent>((l) => {
				const duration = Math.max(
					1,
					Math.floor((l.endTime.getTime() - l.createdAt.getTime()) / 86_400_000),
				);
				return {
					kind: "lock",
					text: `Locked for ${duration}d on ${truncAddr(l.tokenAddress)}`,
					secondsAgo: secondsAgo(l.createdAt),
					txHash: l.txHash,
				};
			}),
			...launches.map<LiveEvent>((l) => ({
				kind: "launch",
				text: l.graduated
					? `${l.symbol} graduated to Uniswap v4`
					: `${l.symbol} launched on bonding curve`,
				secondsAgo: secondsAgo(l.createdAt),
				txHash: l.txHash,
			})),
			...claims.map<LiveEvent>((c) => ({
				kind: "claim",
				text: `${c.recipientCount.toLocaleString()} wallets eligible · ${c.title}`,
				secondsAgo: secondsAgo(c.createdAt),
				txHash: c.txHash,
			})),
			...multisends.map<LiveEvent>((m) => ({
				kind: "multisend",
				text: `Payroll sent to ${m.recipientCount} contributors`,
				secondsAgo: secondsAgo(m.createdAt),
				txHash: m.txHash,
			})),
			...swaps.map<LiveEvent>((s) => ({
				kind: "swap",
				text: `${truncAddr(s.tokenIn)} → ${truncAddr(s.tokenOut)}`,
				secondsAgo: secondsAgo(s.createdAt),
				txHash: s.txHash,
			})),
		];

		events.sort((a, b) => a.secondsAgo - b.secondsAgo);

		return {
			events: events.slice(0, 6),
			block: latestBlock != null ? Number(latestBlock) : null,
		};
	} catch (err) {
		console.error("[live-feed] getLandingLiveFeed failed:", err);
		return { events: [], block: null };
	}
}
