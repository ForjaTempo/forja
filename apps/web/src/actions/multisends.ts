"use server";
import { getDb, schema } from "@forja/db";
import { desc, eq } from "drizzle-orm";

export async function getMultisendsBySender(address: string) {
	const db = getDb();
	return db
		.select()
		.from(schema.multisends)
		.where(eq(schema.multisends.senderAddress, address.toLowerCase()))
		.orderBy(desc(schema.multisends.createdAt));
}

export async function getRecentMultisends(limit = 20) {
	const db = getDb();
	return db
		.select()
		.from(schema.multisends)
		.orderBy(desc(schema.multisends.createdAt))
		.limit(limit);
}
