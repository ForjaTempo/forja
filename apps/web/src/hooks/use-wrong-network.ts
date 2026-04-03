"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { SUPPORTED_CHAIN_IDS, TEMPO_CHAIN_ID } from "@/lib/constants";

export function useWrongNetwork() {
	const chainId = useChainId();
	const { isConnected } = useAccount();
	const { switchChain } = useSwitchChain();
	const toastIdRef = useRef<string | number | undefined>(undefined);

	useEffect(() => {
		const isWrongNetwork = isConnected && !SUPPORTED_CHAIN_IDS.has(chainId);

		if (isWrongNetwork && toastIdRef.current === undefined) {
			toastIdRef.current = toast.warning("Wrong network", {
				description: "Please switch to Tempo to use FORJA.",
				duration: Number.POSITIVE_INFINITY,
				action: {
					label: "Switch",
					onClick: () => switchChain({ chainId: TEMPO_CHAIN_ID }),
				},
			});
		} else if (!isWrongNetwork && toastIdRef.current !== undefined) {
			toast.dismiss(toastIdRef.current);
			toastIdRef.current = undefined;
		}
	}, [chainId, isConnected, switchChain]);
}
