import { NextResponse } from "next/server";
import { validateApiAuth } from "@/lib/api-auth";
import { syncTokenList } from "@/lib/token-list-sync";

export async function POST(request: Request) {
	const authError = validateApiAuth(request);
	if (authError) return authError;

	const start = Date.now();
	try {
		const result = await syncTokenList();
		return NextResponse.json({
			...result,
			duration: `${Date.now() - start}ms`,
		});
	} catch (err) {
		console.error("[token-sync] Failed:", err);
		return NextResponse.json(
			{ error: "Token sync failed", message: err instanceof Error ? err.message : "Unknown error" },
			{ status: 500 },
		);
	}
}
