import "server-only";
import { NextResponse } from "next/server";

/**
 * Validate API key authentication from the Authorization header.
 * Returns null if auth is valid, or a NextResponse error to return early.
 */
export function validateApiAuth(request: Request): NextResponse | null {
	const apiKey = process.env.INDEXER_API_KEY;
	if (!apiKey) {
		return NextResponse.json({ error: "Indexer not configured" }, { status: 500 });
	}

	const authHeader = request.headers.get("authorization");
	if (authHeader !== `Bearer ${apiKey}`) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	return null;
}
