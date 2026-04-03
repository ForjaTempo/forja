import { getDb, schema } from "@forja/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
	const apiKey = process.env.INDEXER_API_KEY;
	if (!apiKey) {
		return NextResponse.json({ error: "Indexer not configured" }, { status: 500 });
	}

	const authHeader = request.headers.get("authorization");
	if (authHeader !== `Bearer ${apiKey}`) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const db = getDb();
	const states = await db.select().from(schema.indexerState);

	return NextResponse.json({
		contracts: states.map((s) => ({
			name: s.contractName,
			lastIndexedBlock: s.lastIndexedBlock,
			updatedAt: s.updatedAt,
		})),
	});
}
