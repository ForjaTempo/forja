import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "forja_session";
const SESSION_DURATION = 24 * 60 * 60; // 24h in seconds

function getSecret(): string {
	return createHmac("sha256", "forja-session-salt")
		.update(process.env.DATABASE_URL || "dev-fallback")
		.digest("hex");
}

function sign(payload: string): string {
	return createHmac("sha256", getSecret()).update(payload).digest("hex");
}

function verifyHmac(payload: string, signature: string): boolean {
	const expected = sign(payload);
	try {
		return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(signature, "hex"));
	} catch {
		return false;
	}
}

export async function createSession(address: string): Promise<void> {
	const expiresAt = Math.floor(Date.now() / 1000) + SESSION_DURATION;
	const payload = `${address.toLowerCase()}|${expiresAt}`;
	const hmac = sign(payload);
	const value = `${payload}|${hmac}`;

	const cookieStore = await cookies();
	cookieStore.set(COOKIE_NAME, value, {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
		maxAge: SESSION_DURATION,
		path: "/",
	});
}

export async function getAuthenticatedAddress(): Promise<string | null> {
	const cookieStore = await cookies();
	const cookie = cookieStore.get(COOKIE_NAME)?.value;
	if (!cookie) return null;

	const parts = cookie.split("|");
	if (parts.length !== 3) return null;

	const [address, expiresAtStr, hmac] = parts;
	if (!address || !expiresAtStr || !hmac) return null;

	const payload = `${address}|${expiresAtStr}`;
	if (!verifyHmac(payload, hmac)) return null;

	const expiresAt = Number.parseInt(expiresAtStr, 10);
	if (Date.now() / 1000 > expiresAt) return null;

	return address;
}

/**
 * Verify that the caller owns the requested address.
 * Returns the authenticated address on success, or an error object.
 */
export async function requireAuth(
	requestedAddress: string,
): Promise<{ ok: true; address: string } | { ok: false; error: string }> {
	const authed = await getAuthenticatedAddress();
	if (!authed) return { ok: false, error: "auth_required" };
	if (authed !== requestedAddress.toLowerCase()) return { ok: false, error: "Unauthorized" };
	return { ok: true, address: authed };
}

export async function clearSession(): Promise<void> {
	const cookieStore = await cookies();
	cookieStore.delete(COOKIE_NAME);
}
