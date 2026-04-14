"use server";
import { getDb, schema } from "@forja/db";
import { eq, sql } from "drizzle-orm";
import { isAddress } from "viem";
import { requireAuth } from "@/lib/session";

/** Update token logo after upload — upserts into cache with user_upload source */
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

	const db = getDb();
	const addr = tokenAddress.toLowerCase();

	// Find the token's creator to verify ownership
	const [token] = await db
		.select({
			name: schema.tokens.name,
			symbol: schema.tokens.symbol,
			decimals: schema.tokens.decimals,
			initialSupply: schema.tokens.initialSupply,
			creatorAddress: schema.tokens.creatorAddress,
			createdAt: schema.tokens.createdAt,
		})
		.from(schema.tokens)
		.where(eq(schema.tokens.address, addr))
		.limit(1);

	if (!token) {
		return { ok: false, error: "Token not found" };
	}

	const auth = await requireAuth(token.creatorAddress);
	if (!auth.ok) return auth;

	// Upsert: update if exists, insert seed row if not (sync will fill stats later)
	await db
		.insert(schema.tokenHubCache)
		.values({
			address: addr,
			name: token.name,
			symbol: token.symbol,
			decimals: token.decimals,
			totalSupply: token.initialSupply,
			creatorAddress: token.creatorAddress.toLowerCase(),
			logoUri: logoUrl,
			logoSource: "user_upload",
			isForjaCreated: true,
			createdAt: token.createdAt,
		})
		.onConflictDoUpdate({
			target: schema.tokenHubCache.address,
			set: {
				logoUri: sql`EXCLUDED.logo_uri`,
				logoSource: sql`EXCLUDED.logo_source`,
			},
		});

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
