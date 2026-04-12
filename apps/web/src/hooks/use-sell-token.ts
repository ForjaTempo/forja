"use client";

import type { Hex } from "viem";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { launchpadConfig } from "@/lib/contracts";

interface UseSellTokenReturn {
	sell: (launchId: bigint, tokenAmount: bigint, minUsdcOut: bigint) => void;
	isSelling: boolean;
	isConfirming: boolean;
	isSuccess: boolean;
	txHash: Hex | undefined;
	error: Error | null;
	reset: () => void;
}

export function useSellToken(): UseSellTokenReturn {
	const {
		writeContract,
		data: txHash,
		isPending: isSelling,
		error: writeError,
		reset,
	} = useWriteContract();

	const {
		isLoading: isConfirming,
		isSuccess,
		error: receiptError,
	} = useWaitForTransactionReceipt({
		hash: txHash,
	});

	const sell = (launchId: bigint, tokenAmount: bigint, minUsdcOut: bigint) => {
		writeContract({
			...launchpadConfig,
			functionName: "sell",
			args: [launchId, tokenAmount, minUsdcOut],
		});
	};

	const error = writeError || receiptError || null;

	return {
		sell,
		isSelling,
		isConfirming,
		isSuccess,
		txHash,
		error,
		reset,
	};
}
