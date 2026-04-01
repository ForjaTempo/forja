import { NextResponse } from "next/server";
import { runIndexer } from "@/lib/indexer/run";

export async function POST(request: Request) {
	const apiKey = process.env.INDEXER_API_KEY;
	if (!apiKey) {
		return NextResponse.json({ error: "Indexer not configured" }, { status: 500 });
	}

	const authHeader = request.headers.get("authorization");
	if (authHeader !== `Bearer ${apiKey}`) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const result = await runIndexer();
	return NextResponse.json(result);
}
