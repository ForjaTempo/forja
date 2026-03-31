"use client";

import { useMemo } from "react";
import { decodeEventLog, type Hex, parseUnits } from "viem";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { TIP20_DECIMALS } from "@/lib/constants";
import { multisendConfig } from "@/lib/contracts";

interface UseMultisendReturn {
	multisend: (token: Hex, recipients: Hex[], amounts: string[]) => void;
	isSending: boolean;
	isConfirming: boolean;
	isSuccess: boolean;
	txHash: Hex | undefined;
	recipientCount: bigint | undefined;
	totalAmount: bigint | undefined;
	error: Error | null;
	reset: () => void;
}

export function useMultisend(): UseMultisendReturn {
	const {
		writeContract,
		data: txHash,
		isPending: isSending,
		error: writeError,
		reset,
	} = useWriteContract();

	const {
		data: receipt,
		isLoading: isConfirming,
		isSuccess,
		error: receiptError,
	} = useWaitForTransactionReceipt({
		hash: txHash,
	});

	const parsedEvent = useMemo(() => {
		if (!receipt) return undefined;
		for (const log of receipt.logs) {
			try {
				const decoded = decodeEventLog({
					abi: multisendConfig.abi,
					data: log.data,
					topics: log.topics,
				});
				if (decoded.eventName === "MultisendExecuted") {
					return {
						recipientCount: decoded.args.recipientCount,
						totalAmount: decoded.args.totalAmount,
					};
				}
			} catch {
				// Not our event, skip
			}
		}
		return undefined;
	}, [receipt]);

	const multisend = (token: Hex, recipients: Hex[], amounts: string[]) => {
		const parsedAmounts = amounts.map((a) => parseUnits(a, TIP20_DECIMALS));
		writeContract({
			...multisendConfig,
			functionName: "multisendToken",
			args: [token, recipients, parsedAmounts],
		});
	};

	const error = writeError || receiptError || null;

	return {
		multisend,
		isSending,
		isConfirming,
		isSuccess,
		txHash,
		recipientCount: parsedEvent?.recipientCount,
		totalAmount: parsedEvent?.totalAmount,
		error,
		reset,
	};
}
