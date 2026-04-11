"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { checkAuthStatus } from "@/actions/auth";
import { useWalletAuth } from "@/hooks/use-wallet-auth";

interface AuthContextValue {
	isAuthed: boolean;
	isChecking: boolean;
	/** True when wallet is connected but session is missing/expired — user must sign to proceed. */
	needsAuth: boolean;
	/** Trigger wallet signature to establish session. Returns true on success. */
	requestAuth: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextValue>({
	isAuthed: false,
	isChecking: true,
	needsAuth: false,
	requestAuth: async () => false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
	const { address, isConnected } = useAccount();
	const { ensureAuth } = useWalletAuth();
	const [isAuthed, setIsAuthed] = useState(false);
	const [isChecking, setIsChecking] = useState(false);

	// Passive session check — only verify existing cookie, never auto-sign
	useEffect(() => {
		if (!isConnected || !address) {
			setIsAuthed(false);
			setIsChecking(false);
			return;
		}

		let cancelled = false;

		async function checkSession() {
			setIsChecking(true);
			try {
				const status = await checkAuthStatus();
				if (cancelled) return;

				if (status.authenticated && status.address === (address as string).toLowerCase()) {
					setIsAuthed(true);
				} else {
					setIsAuthed(false);
				}
			} catch {
				if (!cancelled) setIsAuthed(false);
			} finally {
				if (!cancelled) setIsChecking(false);
			}
		}

		checkSession();
		return () => {
			cancelled = true;
		};
	}, [address, isConnected]);

	const requestAuth = useCallback(async (): Promise<boolean> => {
		const ok = await ensureAuth();
		setIsAuthed(ok);
		return ok;
	}, [ensureAuth]);

	const needsAuth = isConnected && !isAuthed && !isChecking;

	const value = useMemo(
		() => ({ isAuthed, isChecking, needsAuth, requestAuth }),
		[isAuthed, isChecking, needsAuth, requestAuth],
	);

	return <AuthContext value={value}>{children}</AuthContext>;
}

/** Check if the connected wallet has an active auth session. */
export function useAuthGate() {
	return useContext(AuthContext);
}
