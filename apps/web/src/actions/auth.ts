"use server";
import { verifyMessage } from "viem";
import { consumeNonce, createNonce, createSession, getAuthenticatedAddress } from "@/lib/session";

const MAX_TIMESTAMP_AGE = 5 * 60; // 5 minutes

/** Generate a one-time challenge nonce for wallet auth. */
export async function getAuthChallenge(): Promise<{ nonce: string }> {
	const nonce = await createNonce();
	return { nonce };
}

export async function authenticateWallet(
	address: string,
	signature: string,
	message: string,
): Promise<{ ok: boolean; error?: string }> {
	try {
		const isValid = await verifyMessage({
			address: address as `0x${string}`,
			message,
			signature: signature as `0x${string}`,
		});

		if (!isValid) {
			return { ok: false, error: "Invalid signature" };
		}

		// Verify message format: "FORJA Auth\nAddress: <addr>\nTimestamp: <ts>\nNonce: <nonce>"
		const lines = message.split("\n");
		if (lines.length !== 4 || lines[0] !== "FORJA Auth") {
			return { ok: false, error: "Invalid message format" };
		}

		const addrLine = lines[1];
		const tsLine = lines[2];
		const nonceLine = lines[3];

		if (
			!addrLine?.startsWith("Address: ") ||
			!tsLine?.startsWith("Timestamp: ") ||
			!nonceLine?.startsWith("Nonce: ")
		) {
			return { ok: false, error: "Invalid message format" };
		}

		const msgAddress = addrLine.slice("Address: ".length);
		if (msgAddress !== address.toLowerCase()) {
			return { ok: false, error: "Address mismatch" };
		}

		const timestamp = Number.parseInt(tsLine.slice("Timestamp: ".length), 10);
		if (Number.isNaN(timestamp)) {
			return { ok: false, error: "Invalid timestamp" };
		}

		const now = Math.floor(Date.now() / 1000);
		if (Math.abs(now - timestamp) > MAX_TIMESTAMP_AGE) {
			return { ok: false, error: "Expired timestamp" };
		}

		// Verify and consume the server-issued nonce
		const msgNonce = nonceLine.slice("Nonce: ".length);
		const storedNonce = await consumeNonce();
		if (!storedNonce || storedNonce !== msgNonce) {
			return { ok: false, error: "Invalid or expired nonce" };
		}

		await createSession(address.toLowerCase());
		return { ok: true };
	} catch (err) {
		console.error("[auth] authenticateWallet failed:", err);
		return { ok: false, error: "Authentication failed" };
	}
}

export async function checkAuthStatus(): Promise<{
	authenticated: boolean;
	address: string | null;
}> {
	const address = await getAuthenticatedAddress();
	return { authenticated: !!address, address };
}
