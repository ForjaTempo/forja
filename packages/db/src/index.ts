import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

function createDb() {
	const databaseUrl = process.env.DATABASE_URL;
	if (!databaseUrl) {
		throw new Error("DATABASE_URL environment variable is required");
	}

	const client = postgres(databaseUrl);
	return drizzle(client, { schema });
}

let _db: ReturnType<typeof createDb> | null = null;

export function getDb() {
	if (!_db) {
		_db = createDb();
	}
	return _db;
}

export { schema };
export type Token = typeof schema.tokens.$inferSelect;
export type Multisend = typeof schema.multisends.$inferSelect;
export type Lock = typeof schema.locks.$inferSelect;
export type Claim = typeof schema.claims.$inferSelect;
export type IndexerState = typeof schema.indexerState.$inferSelect;
