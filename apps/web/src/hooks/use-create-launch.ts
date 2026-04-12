"use client";

import { useMemo } from "react";
import { decodeEventLog, type Hex } from "viem";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { launchpadConfig } from "@/lib/contracts";

interface UseCreateLaunchReturn {
	createLaunch: (name: string, symbol: string, description: string, imageUri: string) => void;
	isCreating: boolean;
	isConfirming: boolean;
	isSuccess: boolean;
	txHash: Hex | undefined;
	launchId: bigint | undefined;
	tokenAddress: Hex | undefined;
	error: Error | null;
	reset: () => void;
}

export function useCreateLaunch(): UseCreateLaunchReturn {
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

	const parsed = useMemo<{ launchId: bigint; token: Hex } | undefined>(() => {
		if (!receipt) return undefined;
		for (const log of receipt.logs) {
			try {
				const decoded = decodeEventLog({
					abi: launchpadConfig.abi,
					data: log.data,
					topics: log.topics,
				});
				if (decoded.eventName === "LaunchCreated") {
					return {
						launchId: decoded.args.launchId,
						token: decoded.args.token,
					};
				}
			} catch {
				// Not our event
			}
		}
		return undefined;
	}, [receipt]);

	const createLaunch = (name: string, symbol: string, description: string, imageUri: string) => {
		writeContract({
			...launchpadConfig,
			functionName: "createLaunch",
			args: [name, symbol, description, imageUri],
		});
	};

	const error = writeError || receiptError || null;

	return {
		createLaunch,
		isCreating,
		isConfirming,
		isSuccess,
		txHash,
		launchId: parsed?.launchId,
		tokenAddress: parsed?.token,
		error,
		reset,
	};
}
