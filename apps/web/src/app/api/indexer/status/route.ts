import { getDb, schema } from "@forja/db";
import { NextResponse } from "next/server";
import { validateApiAuth } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
	const authError = validateApiAuth(request);
	if (authError) return authError;

	try {
		const db = getDb();
		const states = await db.select().from(schema.indexerState);

		return NextResponse.json({
			contracts: states.map((s) => ({
				name: s.contractName,
				lastIndexedBlock: s.lastIndexedBlock,
				updatedAt: s.updatedAt,
			})),
		});
	} catch (err) {
		const message = err instanceof Error ? err.message : "Unknown error";
		console.error("[indexer-status] DB query failed:", message);
		return NextResponse.json({ status: "unhealthy", error: message }, { status: 503 });
	}
}
