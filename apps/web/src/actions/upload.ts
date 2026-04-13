"use server";
import { getDb, schema } from "@forja/db";
import { eq } from "drizzle-orm";
import { isAddress } from "viem";
import { requireAuth } from "@/lib/session";

/** Update token logo after upload — marks as user_upload to prevent sync overwrite */
export async function updateTokenLogo(
	tokenAddress: string,
	logoUrl: string,
): Promise<{ ok: boolean; error?: string }> {
	if (!isAddress(tokenAddress)) {
		return { ok: false, error: "Invalid token address" };
	}

	if (!logoUrl.startsWith("/api/images/")) {
		return { ok: false, error: "Invalid image URL" };
	}

	// Find the token's creator to verify ownership
	const db = getDb();
	const [token] = await db
		.select({ creatorAddress: schema.tokens.creatorAddress })
		.from(schema.tokens)
		.where(eq(schema.tokens.address, tokenAddress.toLowerCase()))
		.limit(1);

	if (!token) {
		return { ok: false, error: "Token not found" };
	}

	const auth = await requireAuth(token.creatorAddress);
	if (!auth.ok) return auth;

	// Update or insert cache entry
	const [existing] = await db
		.select({ id: schema.tokenHubCache.id })
		.from(schema.tokenHubCache)
		.where(eq(schema.tokenHubCache.address, tokenAddress.toLowerCase()))
		.limit(1);

	if (existing) {
		await db
			.update(schema.tokenHubCache)
			.set({ logoUri: logoUrl, logoSource: "user_upload" })
			.where(eq(schema.tokenHubCache.address, tokenAddress.toLowerCase()));
	}

	return { ok: true };
}

/** Update launch image after upload */
export async function updateLaunchImage(
	launchDbId: number,
	imageUrl: string,
): Promise<{ ok: boolean; error?: string }> {
	if (!imageUrl.startsWith("/api/images/")) {
		return { ok: false, error: "Invalid image URL" };
	}

	const db = getDb();
	const [launch] = await db
		.select({ creatorAddress: schema.launches.creatorAddress })
		.from(schema.launches)
		.where(eq(schema.launches.id, launchDbId))
		.limit(1);

	if (!launch) {
		return { ok: false, error: "Launch not found" };
	}

	const auth = await requireAuth(launch.creatorAddress);
	if (!auth.ok) return auth;

	await db
		.update(schema.launches)
		.set({ imageUri: imageUrl })
		.where(eq(schema.launches.id, launchDbId));

	return { ok: true };
}
