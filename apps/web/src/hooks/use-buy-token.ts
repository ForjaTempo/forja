"use client";

import type { Hex } from "viem";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { launchpadConfig } from "@/lib/contracts";

interface UseBuyTokenReturn {
	buy: (launchId: bigint, usdcAmount: bigint, minTokensOut: bigint) => void;
	isBuying: boolean;
	isConfirming: boolean;
	isSuccess: boolean;
	txHash: Hex | undefined;
	error: Error | null;
	reset: () => void;
}

export function useBuyToken(): UseBuyTokenReturn {
	const {
		writeContract,
		data: txHash,
		isPending: isBuying,
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

	const buy = (launchId: bigint, usdcAmount: bigint, minTokensOut: bigint) => {
		writeContract({
			...launchpadConfig,
			functionName: "buy",
			args: [launchId, usdcAmount, minTokensOut],
		});
	};

	const error = writeError || receiptError || null;

	return {
		buy,
		isBuying,
		isConfirming,
		isSuccess,
		txHash,
		error,
		reset,
	};
}
