import { getDb, schema } from "@forja/db";
import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Liveness probe for Dokploy / CI. Intentionally minimal: the anonymous
 * response is `{ status: "ok" | "error" }` so a passing attacker can't
 * profile uptime, instance count, or request latency. Detailed signals are
 * only returned when the caller presents the indexer API key.
 */
export async function GET(request: Request) {
	const authHeader = request.headers.get("authorization") ?? "";
	const apiKey = process.env.INDEXER_API_KEY;
	const hasDetailAccess =
		!!apiKey &&
		authHeader.length === `Bearer ${apiKey}`.length &&
		authHeader === `Bearer ${apiKey}`;

	const start = Date.now();
	try {
		const db = getDb();
		await db.select({ now: sql`now()` }).from(schema.indexerState).limit(1);
	} catch {
		return NextResponse.json(
			hasDetailAccess
				? {
						status: "error",
						uptime: process.uptime(),
						db: "disconnected",
						latency: Date.now() - start,
					}
				: { status: "error" },
			{ status: 503 },
		);
	}

	return NextResponse.json(
		hasDetailAccess
			? {
					status: "ok",
					uptime: process.uptime(),
					db: "connected",
					latency: Date.now() - start,
				}
			: { status: "ok" },
	);
}
