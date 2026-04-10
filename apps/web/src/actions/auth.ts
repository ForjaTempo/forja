"use server";
import { verifyMessage } from "viem";
import { createSession, getAuthenticatedAddress } from "@/lib/session";

const MAX_TIMESTAMP_AGE = 5 * 60; // 5 minutes

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

		// Verify message format: "FORJA Auth\nAddress: <addr>\nTimestamp: <ts>"
		const expectedPrefix = `FORJA Auth\nAddress: ${address.toLowerCase()}\nTimestamp: `;
		if (!message.startsWith(expectedPrefix)) {
			return { ok: false, error: "Invalid message format" };
		}

		const timestamp = Number.parseInt(message.slice(expectedPrefix.length), 10);
		if (Number.isNaN(timestamp)) {
			return { ok: false, error: "Invalid timestamp" };
		}

		const now = Math.floor(Date.now() / 1000);
		if (Math.abs(now - timestamp) > MAX_TIMESTAMP_AGE) {
			return { ok: false, error: "Expired timestamp" };
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
