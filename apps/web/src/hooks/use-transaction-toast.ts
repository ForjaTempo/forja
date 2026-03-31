"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { useExplorerUrl } from "@/hooks/use-explorer-url";

export function useTransactionToast() {
	const explorerUrl = useExplorerUrl();

	const txSubmitted = useCallback(
		(hash: string) => {
			toast.info("Transaction submitted", {
				description: `${hash.slice(0, 10)}...${hash.slice(-8)}`,
				action: {
					label: "View",
					onClick: () => window.open(`${explorerUrl}/tx/${hash}`, "_blank"),
				},
			});
		},
		[explorerUrl],
	);

	const txConfirmed = useCallback(
		(hash: string) => {
			toast.success("Transaction confirmed", {
				description: `${hash.slice(0, 10)}...${hash.slice(-8)}`,
				action: {
					label: "View",
					onClick: () => window.open(`${explorerUrl}/tx/${hash}`, "_blank"),
				},
			});
		},
		[explorerUrl],
	);

	const txFailed = useCallback((error: string) => {
		toast.error("Transaction failed", {
			description: error,
		});
	}, []);

	return { txSubmitted, txConfirmed, txFailed };
}
