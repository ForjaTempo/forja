"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { checkAuthStatus } from "@/actions/auth";
import { useWalletAuth } from "@/hooks/use-wallet-auth";

interface AuthContextValue {
	isAuthed: boolean;
	isChecking: boolean;
}

const AuthContext = createContext<AuthContextValue>({
	isAuthed: false,
	isChecking: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
	const { address, isConnected } = useAccount();
	const { ensureAuth } = useWalletAuth();
	const [isAuthed, setIsAuthed] = useState(false);
	const [isChecking, setIsChecking] = useState(false);

	useEffect(() => {
		if (!isConnected || !address) {
			setIsAuthed(false);
			setIsChecking(false);
			return;
		}

		let cancelled = false;

		async function bootstrap() {
			setIsChecking(true);
			try {
				const status = await checkAuthStatus();
				if (cancelled) return;

				if (status.authenticated && status.address === (address as string).toLowerCase()) {
					setIsAuthed(true);
					setIsChecking(false);
					return;
				}

				// No session or wallet mismatch — request signature
				const ok = await ensureAuth();
				if (!cancelled) setIsAuthed(ok);
			} catch {
				if (!cancelled) setIsAuthed(false);
			} finally {
				if (!cancelled) setIsChecking(false);
			}
		}

		bootstrap();
		return () => {
			cancelled = true;
		};
	}, [address, isConnected, ensureAuth]);

	const value = useMemo(() => ({ isAuthed, isChecking }), [isAuthed, isChecking]);

	return <AuthContext value={value}>{children}</AuthContext>;
}

/** Check if the connected wallet has an active auth session. */
export function useAuthGate() {
	return useContext(AuthContext);
}
