"use server";
import { getDb, schema } from "@forja/db";
import { desc, eq } from "drizzle-orm";
import { isAddress } from "viem";

export async function getMultisendsBySender(address: string) {
	if (!isAddress(address)) {
		return [];
	}
	const db = getDb();
	return db
		.select()
		.from(schema.multisends)
		.where(eq(schema.multisends.senderAddress, address.toLowerCase()))
		.orderBy(desc(schema.multisends.createdAt));
}
