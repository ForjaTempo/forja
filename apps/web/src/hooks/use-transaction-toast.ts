"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { TEMPO_EXPLORER } from "@/lib/constants";

export function useTransactionToast() {
	const txSubmitted = useCallback((hash: string) => {
		toast.info("Transaction submitted", {
			description: `${hash.slice(0, 10)}...${hash.slice(-8)}`,
			action: {
				label: "View",
				onClick: () => window.open(`${TEMPO_EXPLORER}/tx/${hash}`, "_blank"),
			},
		});
	}, []);

	const txConfirmed = useCallback((hash: string) => {
		toast.success("Transaction confirmed", {
			description: `${hash.slice(0, 10)}...${hash.slice(-8)}`,
			action: {
				label: "View",
				onClick: () => window.open(`${TEMPO_EXPLORER}/tx/${hash}`, "_blank"),
			},
		});
	}, []);

	const txFailed = useCallback((error: string) => {
		toast.error("Transaction failed", {
			description: error,
		});
	}, []);

	return { txSubmitted, txConfirmed, txFailed };
}
