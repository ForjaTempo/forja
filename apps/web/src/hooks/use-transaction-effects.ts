"use client";

import { useEffect, useRef } from "react";
import { useTransactionToast } from "./use-transaction-toast";

interface UseTransactionEffectsOptions {
	txHash: string | undefined;
	isConfirming: boolean;
	isSuccess: boolean;
	error: Error | null;
	onSuccess?: () => void;
	/** Whether to call txConfirmed toast on success. Defaults to false. */
	showConfirmedToast?: boolean;
}

/**
 * Handles the 3 common useEffect patterns for transaction lifecycle:
 * 1. Toast on tx submitted (hash received + confirming)
 * 2. Toast on failure
 * 3. Callback on success (fires once)
 */
export function useTransactionEffects({
	txHash,
	isConfirming,
	isSuccess,
	error,
	onSuccess,
	showConfirmedToast = false,
}: UseTransactionEffectsOptions) {
	const { txSubmitted, txConfirmed, txFailed } = useTransactionToast();
	const successFired = useRef(false);

	// Reset guard when txHash changes (new transaction)
	useEffect(() => {
		successFired.current = false;
	}, [txHash]);

	// Toast on tx submitted
	useEffect(() => {
		if (txHash && isConfirming) {
			txSubmitted(txHash);
		}
	}, [txHash, isConfirming, txSubmitted]);

	// Toast on failure
	useEffect(() => {
		if (error) {
			txFailed(
				error.message?.includes("User rejected")
					? "Transaction rejected"
					: (error.message?.slice(0, 80) ?? "Transaction failed"),
			);
		}
	}, [error, txFailed]);

	// Success callback (fires once)
	useEffect(() => {
		if (isSuccess && txHash && !successFired.current) {
			successFired.current = true;
			if (showConfirmedToast) {
				txConfirmed(txHash);
			}
			onSuccess?.();
		}
	}, [isSuccess, txHash, onSuccess, showConfirmedToast, txConfirmed]);
}
