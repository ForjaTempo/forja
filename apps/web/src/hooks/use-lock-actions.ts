"use client";

import type { Hex } from "viem";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { lockerConfig, lockerV2Config } from "@/lib/contracts";
import type { LockSource } from "@/lib/lock-utils";

function getAddress(source: LockSource) {
	return source === "v2" ? lockerV2Config.address : lockerConfig.address;
}

interface UseLockActionReturn {
	execute: (lockId: bigint, source: LockSource) => void;
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

	const execute = (lockId: bigint, source: LockSource) => {
		writeContract({
			abi: lockerConfig.abi,
			address: getAddress(source),
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

	const execute = (lockId: bigint, source: LockSource) => {
		writeContract({
			abi: lockerConfig.abi,
			address: getAddress(source),
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
