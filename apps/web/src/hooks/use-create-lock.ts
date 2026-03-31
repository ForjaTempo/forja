"use client";

import { useMemo } from "react";
import { decodeEventLog, type Hex } from "viem";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { lockerConfig } from "@/lib/contracts";

interface UseCreateLockReturn {
	createLock: (
		token: Hex,
		beneficiary: Hex,
		amount: bigint,
		lockDuration: bigint,
		cliffDuration: bigint,
		vestingEnabled: boolean,
		revocable: boolean,
	) => void;
	isCreating: boolean;
	isConfirming: boolean;
	isSuccess: boolean;
	txHash: Hex | undefined;
	lockId: bigint | undefined;
	error: Error | null;
	reset: () => void;
}

export function useCreateLock(): UseCreateLockReturn {
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

	const lockId = useMemo<bigint | undefined>(() => {
		if (!receipt) return undefined;
		for (const log of receipt.logs) {
			try {
				const decoded = decodeEventLog({
					abi: lockerConfig.abi,
					data: log.data,
					topics: log.topics,
				});
				if (decoded.eventName === "LockCreated") {
					return decoded.args.lockId;
				}
			} catch {
				// Not our event, skip
			}
		}
		return undefined;
	}, [receipt]);

	const createLock = (
		token: Hex,
		beneficiary: Hex,
		amount: bigint,
		lockDuration: bigint,
		cliffDuration: bigint,
		vestingEnabled: boolean,
		revocable: boolean,
	) => {
		writeContract({
			...lockerConfig,
			functionName: "createLock",
			args: [token, beneficiary, amount, lockDuration, cliffDuration, vestingEnabled, revocable],
		});
	};

	const error = writeError || receiptError || null;

	return {
		createLock,
		isCreating,
		isConfirming,
		isSuccess,
		txHash,
		lockId,
		error,
		reset,
	};
}
