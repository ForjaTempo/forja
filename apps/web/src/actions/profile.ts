"use server";
import { getDb, schema } from "@forja/db";
import { eq } from "drizzle-orm";
import { isAddress } from "viem";
import { getAuthenticatedAddress, requireAuth } from "@/lib/session";

const MAX_DISPLAY_NAME = 60;
const MAX_BIO = 280;
const HTTPS_RE = /^https:\/\/.+/;

interface ProfileData {
	displayName?: string;
	bio?: string;
	avatarUrl?: string;
	website?: string;
	twitterHandle?: string;
	telegramHandle?: string;
}

/** Private read — returns own profile data for editing. Requires auth. */
export async function getCreatorProfileData(address: string) {
	if (!isAddress(address)) return null;

	const authed = await getAuthenticatedAddress();
	if (authed !== address.toLowerCase()) return null;

	try {
		const db = getDb();
		const [row] = await db
			.select()
			.from(schema.creatorProfiles)
			.where(eq(schema.creatorProfiles.walletAddress, address.toLowerCase()))
			.limit(1);

		return row ?? null;
	} catch (err) {
		console.error("[actions] getCreatorProfileData failed:", err);
		return null;
	}
}

/** Public read — used by trust signals. No auth needed. */
export async function isProfileClaimed(address: string): Promise<boolean> {
	if (!isAddress(address)) return false;

	try {
		const db = getDb();
		const [row] = await db
			.select({ id: schema.creatorProfiles.id })
			.from(schema.creatorProfiles)
			.where(eq(schema.creatorProfiles.walletAddress, address.toLowerCase()))
			.limit(1);

		return !!row;
	} catch (err) {
		console.error("[actions] isProfileClaimed failed:", err);
		return false;
	}
}

/** Write — requires wallet auth session. */
export async function upsertCreatorProfile(
	address: string,
	data: ProfileData,
): Promise<{ ok: boolean; error?: string }> {
	if (!isAddress(address)) {
		return { ok: false, error: "Invalid address" };
	}

	const auth = await requireAuth(address);
	if (!auth.ok) return auth;

	const displayName = data.displayName?.trim() || null;
	const bio = data.bio?.trim() || null;
	const avatarUrl = data.avatarUrl?.trim() || null;
	const website = data.website?.trim() || null;
	const twitterHandle = data.twitterHandle?.trim().replace(/^@/, "") || null;
	const telegramHandle = data.telegramHandle?.trim().replace(/^@/, "") || null;

	if (displayName && displayName.length > MAX_DISPLAY_NAME) {
		return { ok: false, error: `Display name must be ${MAX_DISPLAY_NAME} characters or less` };
	}
	if (bio && bio.length > MAX_BIO) {
		return { ok: false, error: `Bio must be ${MAX_BIO} characters or less` };
	}
	if (avatarUrl && !HTTPS_RE.test(avatarUrl)) {
		return { ok: false, error: "Avatar URL must start with https://" };
	}
	if (website && !HTTPS_RE.test(website)) {
		return { ok: false, error: "Website URL must start with https://" };
	}

	try {
		const db = getDb();
		const walletAddress = auth.address;

		await db
			.insert(schema.creatorProfiles)
			.values({
				walletAddress,
				displayName,
				bio,
				avatarUrl,
				website,
				twitterHandle,
				telegramHandle,
			})
			.onConflictDoUpdate({
				target: schema.creatorProfiles.walletAddress,
				set: {
					displayName,
					bio,
					avatarUrl,
					website,
					twitterHandle,
					telegramHandle,
					updatedAt: new Date(),
				},
			});

		return { ok: true };
	} catch (err) {
		console.error("[actions] upsertCreatorProfile failed:", err);
		return { ok: false, error: "Failed to save profile" };
	}
}
