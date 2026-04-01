"use server";
import { getDb, schema } from "@forja/db";
import { desc } from "drizzle-orm";

export async function getRecentLocks(limit = 20) {
	const db = getDb();
	return db.select().from(schema.locks).orderBy(desc(schema.locks.createdAt)).limit(limit);
}
