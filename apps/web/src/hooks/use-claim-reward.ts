"use client";

import type { Hex } from "viem";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { claimerConfig } from "@/lib/contracts";

interface UseClaimRewardReturn {
	claim: (campaignId: bigint, amount: bigint, proof: Hex[]) => void;
	isClaiming: boolean;
	isConfirming: boolean;
	isSuccess: boolean;
	txHash: Hex | undefined;
	error: Error | null;
	reset: () => void;
}

export function useClaimReward(): UseClaimRewardReturn {
	const {
		writeContract,
		data: txHash,
		isPending: isClaiming,
		error: writeError,
		reset,
	} = useWriteContract();

	const {
		isLoading: isConfirming,
		isSuccess,
		error: receiptError,
	} = useWaitForTransactionReceipt({ hash: txHash });

	const claim = (campaignId: bigint, amount: bigint, proof: Hex[]) => {
		writeContract({
			...claimerConfig,
			functionName: "claim",
			args: [campaignId, amount, proof],
		});
	};

	const error = writeError || receiptError || null;

	return {
		claim,
		isClaiming,
		isConfirming,
		isSuccess,
		txHash,
		error,
		reset,
	};
}
