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

type DbInstance = ReturnType<typeof createDb>;

// Use globalThis to prevent connection leaks during Next.js hot-reload in dev
const globalForDb = globalThis as unknown as { _forjaDb?: DbInstance };

export function getDb() {
	if (!globalForDb._forjaDb) {
		globalForDb._forjaDb = createDb();
	}
	return globalForDb._forjaDb;
}

export { schema };
export type Token = typeof schema.tokens.$inferSelect;
export type Multisend = typeof schema.multisends.$inferSelect;
export type Lock = typeof schema.locks.$inferSelect;
export type Claim = typeof schema.claims.$inferSelect;
export type IndexerState = typeof schema.indexerState.$inferSelect;
