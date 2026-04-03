"use server";
import { getDb, schema } from "@forja/db";
import { desc, eq } from "drizzle-orm";
import { isAddress } from "viem";

export async function getTokensByCreator(address: string) {
	if (!isAddress(address)) {
		return [];
	}
	try {
		const db = getDb();
		return await db
			.select()
			.from(schema.tokens)
			.where(eq(schema.tokens.creatorAddress, address.toLowerCase()))
			.orderBy(desc(schema.tokens.createdAt))
			.limit(100);
	} catch (err) {
		console.error("[actions] getTokensByCreator failed:", err);
		return [];
	}
}
