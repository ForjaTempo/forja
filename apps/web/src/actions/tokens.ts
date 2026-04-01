"use server";
import { getDb, schema } from "@forja/db";
import { desc, eq } from "drizzle-orm";

export async function getTokensByCreator(address: string) {
	const db = getDb();
	return db
		.select()
		.from(schema.tokens)
		.where(eq(schema.tokens.creatorAddress, address.toLowerCase()))
		.orderBy(desc(schema.tokens.createdAt));
}

export async function getRecentTokens(limit = 20) {
	const db = getDb();
	return db.select().from(schema.tokens).orderBy(desc(schema.tokens.createdAt)).limit(limit);
}
