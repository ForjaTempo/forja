"use client";

import type { Hex } from "viem";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { lockerConfig } from "@/lib/contracts";

interface UseLockActionReturn {
	execute: (lockId: bigint) => void;
	isPending: boolean;
	isConfirming: boolean;
	isSuccess: boolean;
	txHash: Hex | undefined;
	error: Error | null;
	reset: () => void;
}

export function useClaim(): UseLockActionReturn {
	const { writeContract, data: txHash, isPending, error: writeError, reset } = useWriteContract();

	const {
		isLoading: isConfirming,
		isSuccess,
		error: receiptError,
	} = useWaitForTransactionReceipt({
		hash: txHash,
	});

	const execute = (lockId: bigint) => {
		writeContract({
			...lockerConfig,
			functionName: "claim",
			args: [lockId],
		});
	};

	return {
		execute,
		isPending,
		isConfirming,
		isSuccess,
		txHash,
		error: writeError || receiptError || null,
		reset,
	};
}

export function useRevokeLock(): UseLockActionReturn {
	const { writeContract, data: txHash, isPending, error: writeError, reset } = useWriteContract();

	const {
		isLoading: isConfirming,
		isSuccess,
		error: receiptError,
	} = useWaitForTransactionReceipt({
		hash: txHash,
	});

	const execute = (lockId: bigint) => {
		writeContract({
			...lockerConfig,
			functionName: "revokeLock",
			args: [lockId],
		});
	};

	return {
		execute,
		isPending,
		isConfirming,
		isSuccess,
		txHash,
		error: writeError || receiptError || null,
		reset,
	};
}
