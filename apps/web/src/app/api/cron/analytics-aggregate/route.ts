import { NextResponse } from "next/server";
import { aggregateAnalytics } from "@/lib/analytics-aggregator";
import { validateApiAuth } from "@/lib/api-auth";

export async function POST(request: Request) {
	const authError = validateApiAuth(request);
	if (authError) return authError;

	const start = Date.now();
	try {
		const result = await aggregateAnalytics();
		return NextResponse.json({
			...result,
			duration: `${Date.now() - start}ms`,
		});
	} catch (err) {
		console.error("[analytics-aggregate] Failed:", err);
		return NextResponse.json(
			{
				error: "Analytics aggregation failed",
				message: err instanceof Error ? err.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
