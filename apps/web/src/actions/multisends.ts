"use server";
import { getDb, schema } from "@forja/db";
import { desc, eq } from "drizzle-orm";
import { isAddress } from "viem";

export async function getMultisendsBySender(address: string) {
	if (!isAddress(address)) {
		return [];
	}
	try {
		const db = getDb();
		return await db
			.select()
			.from(schema.multisends)
			.where(eq(schema.multisends.senderAddress, address.toLowerCase()))
			.orderBy(desc(schema.multisends.createdAt))
			.limit(100);
	} catch (err) {
		console.error("[actions] getMultisendsBySender failed:", err);
		return [];
	}
}
