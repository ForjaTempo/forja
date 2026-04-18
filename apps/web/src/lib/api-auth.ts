import "server-only";
import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

/**
 * Validate API key authentication from the Authorization header.
 * Returns null if auth is valid, or a NextResponse error to return early.
 *
 * Uses timingSafeEqual to match session.ts's own constant-time HMAC compare —
 * keeping the whole app's token-verification surface consistent so no single
 * endpoint leaks byte-level timing signals.
 */
export function validateApiAuth(request: Request): NextResponse | null {
	const apiKey = process.env.INDEXER_API_KEY;
	if (!apiKey) {
		return NextResponse.json({ error: "Indexer not configured" }, { status: 500 });
	}

	const authHeader = request.headers.get("authorization") ?? "";
	const expected = Buffer.from(`Bearer ${apiKey}`);
	const received = Buffer.from(authHeader);

	if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	return null;
}
