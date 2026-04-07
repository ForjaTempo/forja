"use client";

import { useMemo } from "react";
import type { Hex } from "viem";
import { decodeEventLog } from "viem";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { lockerV2Config } from "@/lib/contracts";

interface UseCreateBatchLockReturn {
	createBatchLock: (
		token: Hex,
		beneficiaries: Hex[],
		amounts: bigint[],
		lockDuration: bigint,
		cliffDuration: bigint,
		vestingEnabled: boolean,
		revocable: boolean,
	) => void;
	isCreating: boolean;
	isConfirming: boolean;
	isSuccess: boolean;
	txHash: Hex | undefined;
	lockIds: bigint[];
	error: Error | null;
	reset: () => void;
}

export function useCreateBatchLock(): UseCreateBatchLockReturn {
	const {
		writeContract,
		data: txHash,
		isPending: isCreating,
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

	const lockIds = useMemo<bigint[]>(() => {
		if (!receipt) return [];
		for (const log of receipt.logs) {
			try {
				const decoded = decodeEventLog({
					abi: lockerV2Config.abi,
					data: log.data,
					topics: log.topics,
				});
				if (decoded.eventName === "BatchLockCreated") {
					return [...(decoded.args as { lockIds: readonly bigint[] }).lockIds];
				}
			} catch {
				// Not our event, skip
			}
		}
		return [];
	}, [receipt]);

	const createBatchLock = (
		token: Hex,
		beneficiaries: Hex[],
		amounts: bigint[],
		lockDuration: bigint,
		cliffDuration: bigint,
		vestingEnabled: boolean,
		revocable: boolean,
	) => {
		writeContract({
			...lockerV2Config,
			functionName: "createBatchLock",
			args: [token, beneficiaries, amounts, lockDuration, cliffDuration, vestingEnabled, revocable],
		});
	};

	const error = writeError || receiptError || null;

	return {
		createBatchLock,
		isCreating,
		isConfirming,
		isSuccess,
		txHash,
		lockIds,
		error,
		reset,
	};
}
