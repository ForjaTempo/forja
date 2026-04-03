import { getDb, schema } from "@forja/db";
import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
	const start = Date.now();

	try {
		const db = getDb();
		await db.select({ now: sql`now()` }).from(schema.indexerState).limit(1);

		return NextResponse.json({
			status: "ok",
			uptime: process.uptime(),
			db: "connected",
			latency: Date.now() - start,
		});
	} catch {
		return NextResponse.json(
			{
				status: "error",
				uptime: process.uptime(),
				db: "disconnected",
				latency: Date.now() - start,
			},
			{ status: 503 },
		);
	}
}
