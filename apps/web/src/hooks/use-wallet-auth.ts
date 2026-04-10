"use client";

import { useCallback, useRef } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { authenticateWallet } from "@/actions/auth";

export function useWalletAuth() {
	const { address } = useAccount();
	const { signMessageAsync } = useSignMessage();
	const authenticatingRef = useRef(false);

	const ensureAuth = useCallback(async (): Promise<boolean> => {
		if (!address || authenticatingRef.current) return false;
		authenticatingRef.current = true;
		try {
			const timestamp = Math.floor(Date.now() / 1000);
			const message = `FORJA Auth\nAddress: ${address.toLowerCase()}\nTimestamp: ${timestamp}`;
			const signature = await signMessageAsync({ message });
			const result = await authenticateWallet(address, signature, message);
			return result.ok;
		} catch {
			return false;
		} finally {
			authenticatingRef.current = false;
		}
	}, [address, signMessageAsync]);

	/**
	 * Execute a server action with automatic auth retry.
	 * If the action returns { error: "auth_required" }, triggers wallet signature and retries once.
	 */
	const withAuth = useCallback(
		async <T extends { ok: boolean; error?: string }>(action: () => Promise<T>): Promise<T> => {
			const result = await action();
			if (!result.ok && result.error === "auth_required") {
				const authed = await ensureAuth();
				if (!authed) return { ...result, error: "Authentication failed" };
				return action();
			}
			return result;
		},
		[ensureAuth],
	);

	return { ensureAuth, withAuth };
}
