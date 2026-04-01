"use server";
import { getDb, schema } from "@forja/db";
import { desc, eq } from "drizzle-orm";
import { isAddress } from "viem";

export async function getTokensByCreator(address: string) {
	if (!isAddress(address)) {
		return [];
	}
	const db = getDb();
	return db
		.select()
		.from(schema.tokens)
		.where(eq(schema.tokens.creatorAddress, address.toLowerCase()))
		.orderBy(desc(schema.tokens.createdAt));
}
