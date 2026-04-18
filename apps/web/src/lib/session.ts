import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "forja_session";
const NONCE_COOKIE = "forja_auth_nonce";
const SESSION_DURATION = 24 * 60 * 60; // 24h in seconds
const NONCE_MAX_AGE = 5 * 60; // 5 minutes

let warnedDevFallback = false;
let cachedSecret: string | null = null;

function getSecret(): Uint8Array {
	if (cachedSecret !== null) return Buffer.from(cachedSecret);

	const explicit = process.env.SESSION_SECRET;
	if (explicit) {
		cachedSecret = explicit;
		return Buffer.from(cachedSecret);
	}

	// Fail-fast at first RUNTIME use in production — must not trigger during
	// `next build` page-data collection, which Next runs with NODE_ENV=production
	// but without access to deploy-time secrets.
	const isProdRuntime =
		process.env.NODE_ENV === "production" &&
		!process.env.NEXT_PHASE?.includes("build") &&
		!process.env.CI;
	if (isProdRuntime) {
		throw new Error("SESSION_SECRET env var is required in production");
	}

	// Dev/test/build-time fallback — derive from a dev-only constant (not
	// DATABASE_URL, which leaks via logs/screenshots and gives an attacker who
	// learns it the ability to forge session tokens). A fresh per-process
	// random byte-string would break hot reload continuity, so we use a
	// stable dev salt that's NEVER valid in production (fail-fast above).
	if (!warnedDevFallback) {
		warnedDevFallback = true;
		console.warn(
			"[session] SESSION_SECRET missing — using dev fallback. Set SESSION_SECRET in production.",
		);
	}
	cachedSecret = createHmac("sha256", "forja-dev-session-salt-do-not-use-in-prod")
		.update("forja-dev-fallback-v1")
		.digest("hex");
	return Buffer.from(cachedSecret);
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
	if (!authed || authed !== requestedAddress.toLowerCase()) {
		return { ok: false, error: "auth_required" };
	}
	return { ok: true, address: authed };
}

export async function clearSession(): Promise<void> {
	const cookieStore = await cookies();
	cookieStore.delete(COOKIE_NAME);
}

/** Generate a one-time nonce, store it in a short-lived httpOnly cookie. */
export async function createNonce(): Promise<string> {
	const nonce = randomBytes(16).toString("hex");
	const expiresAt = Math.floor(Date.now() / 1000) + NONCE_MAX_AGE;
	const payload = `${nonce}|${expiresAt}`;
	const hmac = sign(payload);
	const value = `${payload}|${hmac}`;

	const cookieStore = await cookies();
	cookieStore.set(NONCE_COOKIE, value, {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
		maxAge: NONCE_MAX_AGE,
		path: "/",
	});

	return nonce;
}

/** Read and consume the nonce cookie. Returns null if invalid/expired/missing. */
export async function consumeNonce(): Promise<string | null> {
	const cookieStore = await cookies();
	const cookie = cookieStore.get(NONCE_COOKIE)?.value;
	// Always delete — single use
	cookieStore.delete(NONCE_COOKIE);

	if (!cookie) return null;

	const parts = cookie.split("|");
	if (parts.length !== 3) return null;

	const [nonce, expiresAtStr, hmac] = parts;
	if (!nonce || !expiresAtStr || !hmac) return null;

	const payload = `${nonce}|${expiresAtStr}`;
	if (!verifyHmac(payload, hmac)) return null;

	const expiresAt = Number.parseInt(expiresAtStr, 10);
	if (Date.now() / 1000 > expiresAt) return null;

	return nonce;
}
