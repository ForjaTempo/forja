"use server";
import { getDb, schema } from "@forja/db";
import { count, desc, eq, sql } from "drizzle-orm";
import { isAddress } from "viem";

export async function getTokenHolderCount(tokenAddress: string) {
	if (!isAddress(tokenAddress)) return 0;

	try {
		const db = getDb();
		const [result] = await db
			.select({ value: count() })
			.from(schema.tokenHolderBalances)
			.where(eq(schema.tokenHolderBalances.tokenAddress, tokenAddress.toLowerCase()));

		return result?.value ?? 0;
	} catch (err) {
		console.error("[actions] getTokenHolderCount failed:", err);
		return 0;
	}
}

export async function getTopHolders(tokenAddress: string, limit = 10) {
	if (!isAddress(tokenAddress)) return [];

	try {
		const db = getDb();
		return await db
			.select({
				holderAddress: schema.tokenHolderBalances.holderAddress,
				balance: schema.tokenHolderBalances.balance,
			})
			.from(schema.tokenHolderBalances)
			.where(eq(schema.tokenHolderBalances.tokenAddress, tokenAddress.toLowerCase()))
			.orderBy(desc(sql`CAST(${schema.tokenHolderBalances.balance} AS NUMERIC)`))
			.limit(limit);
	} catch (err) {
		console.error("[actions] getTopHolders failed:", err);
		return [];
	}
}

export async function getTokenTransferCount(tokenAddress: string) {
	if (!isAddress(tokenAddress)) return 0;

	try {
		const db = getDb();
		const [result] = await db
			.select({ value: count() })
			.from(schema.tokenTransfers)
			.where(eq(schema.tokenTransfers.tokenAddress, tokenAddress.toLowerCase()));

		return result?.value ?? 0;
	} catch (err) {
		console.error("[actions] getTokenTransferCount failed:", err);
		return 0;
	}
}
