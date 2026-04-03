"use server";
import { getDb, schema } from "@forja/db";
import { count } from "drizzle-orm";

export async function getGlobalStats() {
	try {
		const db = getDb();

		const [[tokenResult], [multisendResult], [lockResult]] = await Promise.all([
			db.select({ value: count() }).from(schema.tokens),
			db.select({ value: count() }).from(schema.multisends),
			db.select({ value: count() }).from(schema.locks),
		]);

		return {
			tokensCreated: tokenResult?.value ?? 0,
			multisendCount: multisendResult?.value ?? 0,
			locksCreated: lockResult?.value ?? 0,
		};
	} catch (err) {
		console.error("[actions] getGlobalStats failed:", err);
		return {
			tokensCreated: 0,
			multisendCount: 0,
			locksCreated: 0,
		};
	}
}
