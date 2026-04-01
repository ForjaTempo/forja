import { NextResponse } from "next/server";
import { runIndexer } from "@/lib/indexer/run";

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 10;
const requestTimestamps: number[] = [];

function isRateLimited(): boolean {
	const now = Date.now();
	const windowStart = now - RATE_LIMIT_WINDOW_MS;

	while (requestTimestamps.length > 0 && (requestTimestamps[0] ?? 0) < windowStart) {
		requestTimestamps.shift();
	}

	if (requestTimestamps.length >= RATE_LIMIT_MAX) {
		return true;
	}

	requestTimestamps.push(now);
	return false;
}

export async function POST(request: Request) {
	if (isRateLimited()) {
		return NextResponse.json({ error: "Too many requests" }, { status: 429 });
	}

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
