"use server";
import { getDb, schema } from "@forja/db";
import { count, countDistinct } from "drizzle-orm";

export async function getGlobalStats() {
	try {
		const db = getDb();

		const [
			[tokenResult],
			[multisendResult],
			[lockResult],
			[claimResult],
			[launchResult],
			[creatorResult],
		] = await Promise.all([
			db.select({ value: count() }).from(schema.tokens),
			db.select({ value: count() }).from(schema.multisends),
			db.select({ value: count() }).from(schema.locks),
			db.select({ value: count() }).from(schema.claimCampaigns),
			db.select({ value: count() }).from(schema.launches),
			db.select({ value: countDistinct(schema.tokens.creatorAddress) }).from(schema.tokens),
		]);

		return {
			tokensCreated: tokenResult?.value ?? 0,
			multisendCount: multisendResult?.value ?? 0,
			locksCreated: lockResult?.value ?? 0,
			claimCampaigns: claimResult?.value ?? 0,
			launchesCount: launchResult?.value ?? 0,
			uniqueCreators: creatorResult?.value ?? 0,
		};
	} catch (err) {
		console.error("[actions] getGlobalStats failed:", err);
		return {
			tokensCreated: 0,
			multisendCount: 0,
			locksCreated: 0,
			claimCampaigns: 0,
			launchesCount: 0,
			uniqueCreators: 0,
		};
	}
}
